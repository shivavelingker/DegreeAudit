var site = 'https://shivavelingker.github.io/DegreeAudit'


angular.module('myApp')

//Service to login to Facebook
.service('FBAuth', function ($timeout){
	var self = this;
	self.name = "User";
	var loggedIn = false;
	var observers = [];

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

	self.initialize = function (){
		//Wait until SDK has been loaded
		if(typeof FB == 'undefined'){
			$timeout(self.init);
			return;
		}

		FB.getLoginStatus(function (response){
		    self.process(response);
		}, true);
	}

	self.log = function (string){
		FB.AppEvents.logPageView(string);
	}

	self.loginStatus = function (){
		return self.loggedIn;
	}

	self.logout = function (){
		FB.logout();
	}

	self.process = function(response) {
		if(response.status == "connected"){
			self.loggedIn = true;
			FB.api('/me', function(response){
				self.name = response.name;
			})
			notifyObservers();
		}
		else{
			FB.login(function(response){
				self.process(response);
			});			
		}
	}

	self.initialize();
})

//Service to login to Google
.service('GAuth', function ($timeout, FBAuth){
	var self = this;
	var loggedIn = false;
	var observers = [];
	
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

	//SERVICE
	self.loadApi = function (){
		//Finish login process
		gapi.client.load('drive', 'v3').then(function() {
			if(gapi.auth.getToken){
				loggedIn = true;
				notifyObservers();
			}
		});
	};

	self.login = function (){
		//If already logged in
		if(loggedIn && gapi.auth.getToken()) return;

		//If GAPI hasn't finished loading, loop until ready
		if (gapi.auth == undefined){
			$timeout(self.login);
			return;
		}

		var onAuth = function (response){
			//If not logged in
			if(response.error){
				gapi.auth.authorize(
					{
						'client_id': CLIENT_ID,
						'scope': SCOPES.join(' '),
						'immediate': false
					}).then(self.loadApi);
			}
			//If logged in
			else{
				self.loadApi();
			}
		};

		//Try seeing if already logged in
		gapi.auth.authorize(
			{
				'client_id': CLIENT_ID,
				'scope': SCOPES.join(' '),
				'immediate': true
			}, onAuth
		);
	};

	self.loginStatus = function (){
		return loggedIn;
	}

	self.login();
})

.service('Data', function ($timeout, FBAuth, GAuth){
	var self = this;
	var gFile = new Object();
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
			console.log(gFile);
			gapi.client.drive.files.get({
				'fileId': gFile.id
			}).execute(function(resp){
				if(resp.code == 404)
					ons.notification.alert({message: "Shared link is broken or no longer public. You will be redirected to the home page"})
					.then(function(){
						window.location = site;
					});
			})
		}

		if(gFile.id == undefined)
		//Get data file
		gapi.client.drive.files.list({"q": "name = 'data'"}).execute(function(resp, body){
			//File needs to be created
			if(resp.files.length == 0){
				var file = new Object();
				file.title = "data";
				file.name = "data";
				file.mimeType = "text/plain";
				file.body = "New stuff";
				gapi.client.drive.files.create({"resource": file}).execute(function(file){
					console.log("New file created!");
					gFile = file;
					gFile.savable = true;
					var string = '[]\n[{"name":"Unsorted","completed":0,"hours":0}]\n[]\n'+FBAuth.name;
					self.push(string, true);
				});
			}
			else{
				gFile = resp.files[0];
				gFile.savable = true;
			}
			console.log(gFile);
		});
	};

	self.dirty = function (){
		if(self.saved > 0) {
			self.saved = 0;
			notifyObservers();
		}
	}

	self.getId = function (){
		return site + '?share=' + gFile.id;
	}

	self.loginStatus = function (){
		//If nothing has been initialized
		if(gFile.id == undefined)
			return false;
		//If session has ended, redo
		else if(gapi.auth.getToken() == null){
			console.log("Lost connection to services");
			//Reset logged in vars
			FBAuth.loggedIn = false;
			GAuth.loggedIn = false;

			//Call login functions
			FBAuth.initialize();
			GAuth.login();

			//Force everything else to wait
			while(!FBAuth.loginStatus() || !GAuth.loginStatus()){
				$timeout(function(){
					console.log("Attempting to reconnect to services");
				}, 500);
			}
		}
		return true;
	}

	self.listPermissions = function (){
		self.loginStatus();

		gapi.client.drive.permissions.list({
			'fileId': gFile.id
		}).execute(function(response){
			self.public = ((response.permissions.length == 2) ? true : false)
			notifyObservers();
		})
	}

	self.makePrivate = function (){
		self.loginStatus();

		var request = gapi.client.drive.permissions.delete({
			'fileId': gFile.id,
			'permissionId': 'anyoneWithLink'
		}).execute(function(response){
			console.log(response);
			self.listPermissions();
		});
	}

	self.makePublic = function (){
		self.loginStatus();

		var body = {
			'type': 'anyone',
			'role': 'reader'
		};

		var request = gapi.client.drive.permissions.create({
			'fileId': gFile.id,
			'resource': body
		}).execute(function(response){
			console.log(response);
			self.listPermissions();
		});
	}

	self.pull = function (){
		if(!self.loginStatus()){
			$timeout(self.pull);
			return;
		}

		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://www.googleapis.com/drive/v3/files/' + gFile.id + '?alt=media');
		xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
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

	self.push = function (data, pull){
		//Check to make sure still logged in
		self.loginStatus();

		//Overwrite old file data
		self.fileData = data;

		var xhr = new XMLHttpRequest();
		xhr.open('PATCH', 'https://www.googleapis.com/upload/drive/v3/files/' + gFile.id + '?uploadType=media');
		xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
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

	self.save = function (data){
		//Basic lock
		if(self.cntr > 0 || !self.timeLock || !gFile.savable)
			return;

		//Set state to "saving"
		self.saved = 1;
		notifyObservers();

		//Acquire locks
		self.cntr++;
		self.timeLock = false;

		//Set timer for releasing one lock		
		$timeout(self.timer, 5000);

		self.push(data);
	}

	self.timer = function (){
		self.timeLock = true;
	}

	self.destroy = function (){
		self.loginStatus();

		var xhr = new XMLHttpRequest();
		xhr.open('DELETE', 'https://www.googleapis.com/drive/v3/files/' + gFile.id);
		xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4){
				console.log("Profile destroyed");
				window.location = "";
			}
		}
		xhr.send();
	}

	self.init();
})

;