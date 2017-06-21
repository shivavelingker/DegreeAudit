var site = 'https://shivavelingker.github.io/DegreeAudit/';

var siteRedirect = function (){
	window.location = site;
}

angular.module('myApp')

//Service to login to Google
.service('GAuth', function ($timeout){
	var self = this;
	var observers = [];

	var GoogleAuth = null;
	var GoogleUser = null;
	self.name = null;
	self.email = null;
	self.ID = null;
	
	var API_KEY = 'AIzaSyDJMJygZqA7P_Er3RTg0sWlfSLfr50mh7M';
	var CLIENT_ID = '609480981833-puk5ka2mljdde2tteoiqfth0j6qe31de.apps.googleusercontent.com';
	var SCOPES = [ 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.appdata' ];

	//NOTIFICATION SYSTEM
	var notifyObservers = function(){
		angular.forEach(observers, function(observer){
			$timeout();
			observer();
		});
		$timeout();
	};

	self.registerObserver = function(observer){
		if(observers.indexOf(observer) < 0)
			observers.push(observer);
	};

	//LOGIN FLOW
	//Get Google library
	self.init = function (){
		//Get Google library
		gapi.load('auth2', self.initialize);
	}

	//Initialize services
	self.initialize = function (){
		gapi.auth2.init({
			client_id: CLIENT_ID,
			scope: SCOPES.join(' '),
			cookie_policy: 'single_host_origin',
			fetch_basic_profile: true
		}).then(function(){
			GoogleAuth = gapi.auth2.getAuthInstance();
			self.login();
		});
	}

	//Login to Google
	self.login = function (){
		notifyObservers();
		//Check whether user is signed in
		if(!GoogleAuth.isSignedIn.get()){
			//Call login service
			GoogleAuth.signIn().then(function(){
				self.loadApi();
			});
		}
		//Skip to API loading
		else
			self.loadApi();
	};

	//Get Google API
	self.loadApi = function (){
		//Finish login process
		gapi.client.load('drive', 'v3').then(function() {
			//Get user data
			GoogleUser = GoogleAuth.currentUser.get();
			var data = GoogleUser.getBasicProfile();
			self.name = data.getName();
			self.email = data.getEmail();
			self.ID = data.getId();

			//Allow other processes to begin running
			self.loginStatus();
			notifyObservers();

			//Log user for user analytics
			ga('set', 'userId', self.email);
			ga('send', 'pageview');
		});
	};

	//HELPER FUNCTIONS
	//Return access token
	self.getToken = function (){
		return GoogleUser.getAuthResponse().access_token;
	}

	//Return whether user is logged in and API library has been loaded
	self.loginStatus = function (){
		return GoogleAuth && GoogleAuth.isSignedIn.get() && gapi.client.drive;
	}

	self.logout = function (){
		GoogleAuth.signOut();
		window.location = site;
	}

	self.init();
})

.service('Data', function ($timeout, GAuth){
	var self = this;
	var gFile = new Object();
	var uFile = new Object();
	self.fileData = null;
	self.cntr = 0;
	self.timeLock = true;
	self.saved = 2;
	var observers = [];
	var setup = false;

	//NOTIFICATION SYSTEM
	self.deregister = function (remove){
		angular.forEach(observers, function(observer, index){
			if(angular.equals(remove, observer))
				observers.splice(index, 1);
		})
	};

	var notifyObservers = function (){
		angular.forEach(observers, function(observer){
			observer();
			$timeout();
		});
	};

	self.registerObserver = function (observer){
		angular.forEach(observers, function(exist, index){
			if(angular.equals(exist, observer))
				return;
		})
		observers.push(observer);
	};

	//SERVICE
	self.init = function (){
		if(!GAuth.loginStatus()){
			$timeout(self.init);
			return;
		}

		gFile.savable = false;

		//Get file from URL, if accessing a shared schedule
		if(getAllUrlParams().share){
			console.log('Sharable file in use');
			gFile.id = getAllUrlParams().share;
			//Fill in missing data
			gFile.kind = "drive#file";
			gFile.name = "data";
			gFile.mimeType = "text/plain";
			gapi.client.drive.files.get({
				'fileId': gFile.id
			}).execute(function(resp){
				if(resp.code == 404)
					ons.notification.alert({message: "Shared link is broken or no longer public. You will be redirected to the home page"})
					.then(function(){
						window.location = site;
					});
				self.pull();
			});
			uFile = gFile;
		}

		if(gFile.id == undefined){
			//Get data file from AppData Folder
			gapi.client.drive.files.list({"q": "name = 'DegreeAuditJSON'","spaces":"appDataFolder"}).execute(function(resp, body){
				//File needs to be created
				if(resp.files.length == 0){
					var file = new Object();
					file.title = "DegreeAuditJSON";
					file.name = "DegreeAuditJSON";
					file.mimeType = "text/plain";
					file.parents = ["appDataFolder"];
					gapi.client.drive.files.create({"resource": file}).execute(function(file){
						console.log("New file created!");
						gFile = file;
						gFile.savable = true;
						var warning = "**Do not modify this file**\n";
						var string = warning + GAuth.name+'\n[]\n[{"name":"Unsorted","completed":0,"hours":0}]\n[]';
						self.push(string, true, gFile.id);
					});
				}
				else{
					gFile = resp.files[0];
					gFile.savable = true;
				}
				self.pull();
			});
			//Get file stored on user side
			gapi.client.drive.files.list({"q": "name = 'DegreeAuditData.gz'"}).execute(function(resp, body){
				//File needs to be created
				if(resp.files.length == 0){
					var file = new Object();
					file.title = "DegreeAuditData.gz";
					file.name = "DegreeAuditData.gz";
					file.mimeType = "application/rar";
					gapi.client.drive.files.create({"resource": file}).execute(function(file){
						console.log("New user file created!");
						uFile = file;
					});
				}
				else{
					uFile = resp.files[0];
				}
			});
		}
	};

	self.dirty = function (){
		if(self.saved > 0) {
			self.saved = 0;
			notifyObservers();
		}
	}

	self.getId = function (){
		return site + '?share=' + uFile.id;
	}

	self.import = function (){
		//
	}

	self.listPermissions = function (){
		//Check if viewing a shared link
		if(self.sharing()){
			self.public = true;
			notifyObservers();
			return;
		}
		//Check set permissions
		gapi.client.drive.permissions.list({
			'fileId': uFile.id
		}).execute(function(response){
			self.public = ((response.permissions.length == 2) ? true : false)
			notifyObservers();
		})
	}

	self.makePrivate = function (){
		//Prevent viewers from modifying owner's permissions
		if(!gFile.savable)
			return;

		var request = gapi.client.drive.permissions.delete({
			'fileId': uFile.id,
			'permissionId': 'anyoneWithLink'
		}).execute(function(response){
			self.listPermissions();
		});
	}

	self.makePublic = function (){
		var body = {
			'type': 'anyone',
			'role': 'reader'
		};

		var request = gapi.client.drive.permissions.create({
			'fileId': uFile.id,
			'resource': body
		}).execute(function(response){
			self.listPermissions();
		});
	}

	self.pull = function (){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://www.googleapis.com/drive/v3/files/' + gFile.id + '?alt=media');
		xhr.setRequestHeader('Authorization', 'Bearer ' + GAuth.getToken());
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200 ){
				self.fileData = xhr.response;
				// console.log(xhr.response);
				console.log("File received");
				notifyObservers();
			}
		}
		xhr.send();
	};

	self.push = function (data, pull, FILE_ID){
		//Overwrite old file data
		self.fileData = data;

		var xhr = new XMLHttpRequest();
		xhr.open('PATCH', 'https://www.googleapis.com/upload/drive/v3/files/' + FILE_ID + '?uploadType=media');
		xhr.setRequestHeader('Authorization', 'Bearer ' + GAuth.getToken());
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200 ){
				console.log("File saved");
				self.saved = 2;
				//Release lock
				self.cntr--;
				//Pull data again if new file was created
				if(pull){
					self.pull();
				}
				notifyObservers();
			}
		}
		xhr.send(data);
	}

	self.save = function (data, setDirty){
		//Basic lock; update controllers even if not saving to persistent storage
		if(self.cntr > 0 || !self.timeLock || !gFile.savable){
			if(setDirty && !gFile.savable)
				self.dirty();
			if(!gFile.savable)
				ons.notification.alert("You can't save someone else's profile, but you can play around with it");
			return;
		}

		//Set state to "saving"
		self.saved = 1;
		notifyObservers();

		//Acquire locks
		self.cntr++;
		self.timeLock = false;

		//Set timer for releasing one lock		
		$timeout(self.timer, 5000);

		self.push(data, false, gFile.id);
		self.push(data, false, uFile.id);
	}

	self.sharing = function (){
		return !gFile.savable;
	}

	self.timer = function (){
		self.timeLock = true;
	}

	self.destroy = function (terminate){
		var FILE_ID;
		if(terminate)
			FILE_ID = uFile.id;
		else
			FILE_ID = gFile.id;

		var xhr = new XMLHttpRequest();
		xhr.open('DELETE', 'https://www.googleapis.com/drive/v3/files/' + FILE_ID);
		xhr.setRequestHeader('Authorization', 'Bearer ' + GAuth.getToken());
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4){
				console.log("Profile destroyed");
				if(terminate)
					window.location = "";
				else
					self.destroy(true);
			}
		}
		xhr.send();
	}

	self.init();
})

;