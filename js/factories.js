
angular.module('myApp')

//Service to login to Google
.service('GAuth', function ($timeout){
	var self = this;
	var loggedIn = false;
	var observers = [];
	
	var API_KEY = 'AIzaSyDJMJygZqA7P_Er3RTg0sWlfSLfr50mh7M';
	var CLIENT_ID = '609480981833-puk5ka2mljdde2tteoiqfth0j6qe31de.apps.googleusercontent.com';
	// var SCOPES = [ 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file' ];
	var SCOPES = [ 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file'];//, 'https://www.googleapis.com/auth/drive.appdata' ];

	//NOTIFICATION SYSTEM
	var notifyObservers = function(){
		angular.forEach(observers, function(observer){
			$timeout();
			observer();
		});
		$timeout();
	};

	self.registerObserver = function(observer){
		observers.push(observer);
		notifyObservers();
	};

	//SERVICE
	self.loadApi = function (){
		//Finish login process
		gapi.client.load('drive', 'v3').then(function(){
			loggedIn = true;
			notifyObservers();
		});
	};

	self.login = function (){
		//If already logged in
		if(loggedIn) return;

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

.service('Data', function ($timeout, GAuth){
	var self = this;
	var gFile = new Object();
	self.fileData = null;
	self.cntr = 0;
	self.timeLock = true;
	var observers = [];
	var setup = false;

	//NOTIFICATION SYSTEM
	self.deregister = function (remove){
		for(i = 0; i<observers.length; i++)
			if(observers[i] == remove)
				observers.splice(i, 1);
	};

	var notifyObservers = function (){
		angular.forEach(observers, function(observer){
			observer();
			$timeout();
		});
	};

	self.registerObserver = function (observer){
		observers.push(observer);
	};

	//SERVICE
	self.init = function (){
		if(!GAuth.loginStatus()){
			$timeout(self.init);
			return;
		}
		
		//Get "categories.json" file
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
					self.push('[]\n[{"name":"Unsorted","completed":0,"hours":0}]\n[]');
				});
			}
			else{
				gFile = resp.files[0];
			}
			console.log(gFile);
		});
	};

	self.pull = function (){
		var xhr = new XMLHttpRequest();

		xhr.open('GET', 'https://www.googleapis.com/drive/v3/files/' + gFile.id + '?alt=media');
		xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200 ){
				self.fileData = xhr.response;
				console.log(xhr.response);
				notifyObservers();
			}
		}
		xhr.send();
		console.log("pull complete");
	};

	self.push = function (data){
		console.log("lock acquired");

		var xhr = new XMLHttpRequest();

		xhr.open('PATCH', 'https://www.googleapis.com/upload/drive/v3/files/' + gFile.id + '?uploadType=media');
		xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200 ){
				notifyObservers();
				console.log("File saved");
				//Release lock
				self.cntr--;
			}
		}
		xhr.send(data);
	}

	self.save = function (data){
		//Basic lock
		if(self.cntr > 0 || !self.timeLock){ console.log("rejected");
			return;}

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
		console.log("please hold");

		var xhr = new XMLHttpRequest();
		xhr.open('DELETE', 'https://www.googleapis.com/drive/v3/files/' + gFile.id);
		xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4 && xhr.status == 200)
				console.log("destruction complete");
		}
		xhr.send();
	}

	self.init();
})

;