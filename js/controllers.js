var getRand = function() {
  //Use timestamp as a unique identifier
  return Date.now();
}

var name = false;

var degrees;

var getDegreeIdx = function(ID) {
  //Take ID of degree and find array index
  return degrees.map(function(e) { return e.ID; }).indexOf(ID);
}

var getReqIdx = function(ID, degreeIdx) {
  //Take ID of requirement and find array index, with knowledge of degree index
  return degrees[degreeIdx].reqs.map(function(e) { return e.ID; }).indexOf(ID);
}

var semesters = [];

var courses;

var promise;

var addCourse = function() {
  promise = new Promise((resolve, reject) => {
    var newCourse = {
      sizeX: 1,
      sizeY: 1,
      row: 0,
      col: semesters.length - 1,
      ID: getRand(),
      abbr: "",
      name: "",
      hours: 3,
      notes: ""
    };

    //Get basic information
    ons.notification.prompt({message: "Course Abbreviation", cancelable: true})
      .then(function(abbr) {
        //Prevent blank course
        if(abbr == null || abbr.trim() == ""){
          resolve(null);
          return;
        }

        //Update course
        newCourse.abbr = abbr;

        //Insert new course at end
        courses.push(newCourse);

        resolve(newCourse.ID);
      })
      .catch(function(){
        resolve(null);
      });
  });
}

var getCourseIdx = function(ID) {
  //Take ID of course and return course index
  return courses.map(function(e) { return e.ID; }).indexOf(ID);
}

var getCourse = function(ID) {
  //Take ID of course and return course object
  return courses[getCourseIdx(ID)];
}

var updateData = function() {
  //Sort operation
  courses = orderObjectBy(courses, 'abbr');

  var warning = "**DO NOT MODIFY THIS FILE**\n";

  //Convert relevant data to string
  var dataD = angular.toJson(angular.copy(degrees));
  var dataS = angular.toJson(angular.copy(semesters));
  var dataC = angular.toJson(angular.copy(courses));

  //Parse data together
  return warning + name + "\n" + dataD + "\n" + dataS + "\n" + dataC;
}

var orderObjectBy = 
  //Allow array of objects to be sorted by key
  function(input, attribute) {
    if (!angular.isObject(input)) return input;

    var array = [];
    for(var objectKey in input) {
        array.push(input[objectKey]);
    }

    array.sort(function(a, b){
      a = a[attribute].toUpperCase();
      b = b[attribute].toUpperCase();

      if (a < b)
        return -1;
      if (a > b)
        return 1;
      return 0;
    });
    return array;
 };

var profileToast = function() {
  ons.notification.toast({
    animation: "lift",
    message: "Currently viewing "+name+"'s profile. Ready to go to yours? <button onclick='siteRedirect()'> <ons-icon icon='ion-paper-airplane'></ons-icon> &nbsp; Take me to my profile! </button>"
  });
}

var speedDial = function(scope, msg) {
  scope.message = msg;
  ons.createPopover('popoverLeft.html', { parentScope: scope})
  .then(function(popover){
    popover.show(document.getElementById("speedDial"));
  });
}

var isMobile = function() {
  var OP = ons.platform;
  return OP.isIOS() || OP.isAndroid() || OP.isBlackBerry() || OP.isIE();
}

angular.module('myApp')

.controller('Menu', ['$scope', 'Data', function($scope, Data) {
  $scope.saved = Data.saved;

  $scope.load = function(page) {
    nav.replacePage(page).then(function() {
        menu.left.close();
      });
  };

  $scope.init = function() {
    //Maintain knowledge of status of data
    Data.registerObserver(saveStatus);
  }

  $scope.save = function() {
    Data.save(updateData());
  }

  var saveStatus = function() {
    $scope.saved = Data.saved;
    $scope.owned = !Data.sharing();
  }
}])

.controller("LoginCtrl", function($scope, $timeout, GAuth, Data) {
  $scope.signIn = false;
  $scope.isMobile = isMobile;

  $scope.init = function (){
    //Notify controller when signing in has begun, to show button
    GAuth.registerObserver(showButton);

    //Notify this controller once data is pulled from Google
    Data.registerObserver(parseData);
  }

  $scope.manualLogin = function() {
    //Allow login button to be pressed if popups are blocked
    GAuth.login();
  }

  var parseData = function() {
    //Update login status
    $scope.GLoggedIn = GAuth.loginStatus();

    if (angular.equals(semesters, [])){
      var str = (Data.fileData ? Data.fileData.split("\n") : [null, null, null, null, null]);

      name = (str[1] && str[1] != undefined ? str[1] : GAuth.name);

      degrees = (str[2] && str[2] != undefined ? json_parse(str[2]) : []);

      semesters = (str[3] && str[3] != undefined ? json_parse(str[3]) : []);

      courses = (str[4] && str[4] != undefined ? json_parse(str[4]) : []);

      //Remove sign in button
      $scope.signIn = false;

      //Allow menu button to become active
      angular.element(document.querySelector('#mainMenu')).removeAttr("disabled");

      //Notify user of menu button
      loginToast.show();

      //Allow viewers to go to their individual profiles
      if(Data.sharing())
        profileToast();
    }
  }

    var showButton = function() {
      $scope.signIn = true;
    }
})

.controller("CourseCtrl", ['$scope', '$timeout', 'Data', function($scope, $timeout, Data){
  $scope.init = function(){
    //Keep original and new copy of course to check for modifications
    $scope.old = getCourse(nav.topPage.data.course);
    $scope.course = angular.copy($scope.old);
    $scope.shouldBeOpen = (nav.topPage.data.focus != undefined ? false : true);
  }


  $scope.close = function() {
    nav.popPage();
  }

  $scope.delete = function() {
    //Remove course from array of courses
    var pos = getCourseIdx($scope.old.ID);
    courses.splice(pos, 1);

    //Loop through all requirement listings and remove ID
    angular.forEach(degrees, function(degree){
      angular.forEach(degree.reqs, function(req){
        var courseIdx = req.satisfy.indexOf($scope.old.ID);
        if(courseIdx >= 0)
          req.satisfy.splice(courseIdx, 1);
      })
    })

    //Save changes to file
    Data.save(updateData());

    //Pop page
    $scope.close();
  }

  $scope.save = function() {
    //Check if course was modified
    if(angular.equals($scope.old, $scope.course)){
      $scope.close();
      return;
    }

    //Overwrite old course
    var pos = getCourseIdx($scope.old.ID);
    courses[pos] = $scope.course;

    //Save changes to file
    Data.save(updateData());

    //Pop page
    $scope.close();
  }
}])

.controller("CoursesCtrl", function($scope, $timeout, Data) {
  $scope.courses = courses;
  $scope.backButton = false;
  $scope.isMobile = isMobile;

  $scope.init = function() {
    //Determine why controller was instantiated
    if(nav.topPage.data && nav.topPage.data.actionable != undefined)
      $scope.backButton = true;

    //Register observer
    Data.registerObserver($scope.refresh);

    //Notify of speed dial location
    if($scope.courses.length == 0)
      speedDial($scope, "Click here to add a class");
  }

  $scope.action = function(chosenID) {
    //If returning course back to ReqCtrl
    if(nav.topPage.data && nav.topPage.data.actionable){
      nav.topPage.data.actionable(
                  nav.topPage.data.degIdx,
                  nav.topPage.data.reqIdx,
                  chosenID);
      Data.save(updateData());
      nav.popPage();
    }
    //If editing course directly
    else
      $scope.editCourse(chosenID);
  }

  $scope.addCourse = function() {
    //No pre-update of global vars necessary

    //Input dialog
    addCourse();

    promise.then(function(ID){
      if(ID != null){
        //Set dirty
        Data.dirty();

        //Allow modification
        nav.pushPage('html/course.html', {data: {course: ID}});
      }
    });
  }

  $scope.editCourse = function(chosen) {
    nav.pushPage('html/course.html', { data : { course: chosen, focus: false } });
  }

  $scope.pl = function(hours){
    //Append "s" to "hr" if plural
    if(hours > 1)
      return "s";
  }

  $scope.refresh = function() {
    //Pull new set of courses (in case list was sorted)
    $scope.courses = courses;
  }
})

.controller("ReqCtrl", ['$scope', '$timeout', 'Data', function($scope, $timeout, Data){
  $scope.degrees = degrees;

  $scope.init = function() {
    //Save data from stack
    $scope.reqIdx = nav.topPage.data.reqIdx;
    $scope.degIdx = nav.topPage.data.degIdx;
  
    //Copy var data to check for modifications
    $scope.req = angular.copy($scope.degrees[$scope.degIdx].reqs[$scope.reqIdx]);
    $scope.old = angular.copy($scope.req);

    Data.registerObserver($scope.refresh);
  }

  var action = function(degIdx, reqIdx, courseID) {
    //Allow course to be appended to satisfying courses if not already added
    if(degrees[degIdx].reqs[reqIdx].satisfy.indexOf(courseID) < 0)
      degrees[degIdx].reqs[reqIdx].satisfy.push(courseID);
  }

  $scope.addCourse = function() {
    //No pre-update of global vars necessary

    //Input dialog
    addCourse();

    promise.then(function(ID){
      if(ID != null){
        //Set dirty
        Data.dirty();

        //Allow modification
        nav.pushPage('html/course.html', {data: {course: ID}});
      }
    });
  }

  $scope.course = function(ID) {
    $scope.chosen = getCourse(ID);
  }

  $scope.cancel = function() {
    //Put old var back in place
    $scope.degrees[$scope.degIdx].reqs[$scope.reqIdx] = $scope.old;

    //Update global var
    degrees = $scope.degrees;

    //Save changes to file
    Data.save(updateData());

    $scope.close();
  }

  $scope.close = function() {
    nav.popPage();
  }

  $scope.delete = function() {
    //Splice req out of array
    $scope.degrees[$scope.degIdx].reqs.splice($scope.reqIdx, 1);

    //Save changes to file
    Data.save(updateData());

    $scope.close();
  }

  $scope.editCourse = function(ID) {
    nav.pushPage('html/course.html', { data : { course: ID, focus: false } });
  }

  $scope.listClasses = function() {
    //Save changes already made
    if(!angular.equals($scope.old, $scope.req)){
      //Update global var
      $scope.degrees[$scope.degIdx].reqs[$scope.reqIdx] = $scope.req;
      degrees = $scope.degrees;

      //Save changes already made
      Data.save(updateData());
    }

    //Pull up list of all courses for user to choose from
    nav.pushPage("html/courses.html", {data: {actionable: action, degIdx: $scope.degIdx, reqIdx: $scope.reqIdx}});
  }

  $scope.pl = function() {
    if($scope.chosen.hours > 1)
      return "s";
  }

  $scope.rmClass = function(ID) {
    var pos = $scope.req.satisfy.indexOf(ID);
    $scope.req.satisfy.splice(pos, 1);

    //Overwrite local var
    $scope.degrees[$scope.degIdx].reqs[$scope.reqIdx] = $scope.req;
  }

  $scope.save = function() {
    //Check if modified
    if(angular.equals($scope.old, $scope.req)){
      $scope.close();
      return;
    }

    //Overwrite local var
    $scope.degrees[$scope.degIdx].reqs[$scope.reqIdx] = $scope.req;

    //Overwrite global var
    degrees = $scope.degrees;

    //Save changes to file
    Data.save(updateData());

    $scope.close();
  }

  $scope.refresh = function() {
    //Pull new data, in case new course was added to satisfying list
    $scope.degrees = degrees;
    $scope.req = $scope.degrees[$scope.degIdx].reqs[$scope.reqIdx];
  }
}])

.controller('DegreeCtrl', ['$scope', '$timeout', 'Data', function($scope, $timeout, Data) {
  $scope.chosen = null;
  $scope.degrees = null;
  $scope.reqs = [];
  $scope.saved = Data.saved;
  $scope.class = null;
  $scope.status = 0;
  $scope.name = name;

  $scope.init = function() {
    console.log("degree init");

    $scope.degrees = degrees;

    //Calculate degree percentages
    $scope.recalculate();

    //Update display
    $timeout(50);

    //Watch for changes in all data
    Data.registerObserver($scope.refresh);

    //Notify of speed dial location
    if($scope.degrees.length == 0)
      speedDial($scope, "Click here to add a degree plan or class");

    //Notify degree buttons feature
    document.getElementById("degreeToast").show();
    $timeout(function(){ document.getElementById("degreeToast").hide(); }, 5000);
  }

  $scope.addCourse = function() {
    //No pre-update of global vars necessary

    //Input dialog
    addCourse();

    promise.then(function(ID){
      if(ID != null){
        //Set dirty
        Data.dirty();

        //Allow modification
        nav.pushPage('html/course.html', {data: {course: ID}});
      }
    });
  }

  $scope.addDegree = function() {
    ons.notification.prompt({message: "Degree Name", cancelable: true})
       .then(function(name) {
          //Bad input check
          if(name == null || name.trim() == "")
            return;

          //Create degree object
          var degree = {
            ID: getRand(),
            name: name,
            notes: "",
            reqs: []
          };

          //Insert new degree at end
          $scope.degrees.push(degree);

          //Set dirty and update display
          $scope.dirty();
       })
       .catch(function(){
        return true;
       });
  }

  $scope.addReq = function() {
    var newReq = {
      ID: getRand(),
      title: "",
      hours: 1,
      satisfy: []
    };

    //Get title of requirement
    ons.notification.prompt({message: "Requirement", cancelable: true})
      .then(function(title) {
        //Bad input check
        if(title != null && title.trim() != "")
        //Get number of hours
        ons.notification.prompt({message: "Hours", cancelable: true})
          .then(function(hours){
            //Update course
            newReq.title = title;
            newReq.hours = (isNaN(parseInt(hours)) ? 1 : parseInt(hours));

            //Insert new course at end of requirement list
            $scope.chosen.reqs.push(newReq);

            //Set dirty and update global data
            $scope.dirty();
          })
          .catch(function() {
            return true;
          })
      })
      .catch(function() {
        return true;
      });
  }

  $scope.changeDescription = function() {
    //Allow degree to be renamed
    ons.notification.prompt({message: "Changing description for: " + $scope.chosen.name, cancelable: 'true'})
      .then(function(desc) {
          //Bad input check
          if(desc == null)
            return;
          $scope.chosen.notes = desc;
          $scope.dirty();
      })
      .catch(function(){
        return true;
      });
  }

  $scope.courseColoration = function(ID) {
    $scope.class = getCourse(ID);
    
    //Check when course was taken
    var semester = $scope.class.col;

    //Course has been completed
    if(semesters[semester].completed){
      $scope.status = 0;
      $scope.color = "#008080";
    }
    //Course has not been scheduled
    else if(semester == semesters.length - 1){
      $scope.status = 2;
      $scope.color = "#545454";
    }
    //Course has been scheduled
    else{
      $scope.status = 1;
      $scope.color = "#a6a6a6";
    }
  }

  $scope.editReq = function(ID, degree) {
    //Get information
    var degreeIdx = getDegreeIdx(degree);

    //Push page for editing
    nav.pushPage("html/req.html", {data: { degIdx: degreeIdx, reqIdx: getReqIdx(ID, degreeIdx) }});
  }

  $scope.delete = function() {
    //Remove degree from list of degrees
    var pos = getDegreeIdx($scope.chosen.ID);
    $scope.degrees.splice(pos, 1);

    $scope.dirty();
  }

  $scope.dirty = function() {
    $scope.update();
    Data.dirty();
  }

  $scope.modifyDegree = function(degree) {
      $scope.chosen = degree;

      ons.openActionSheet({
        title: 'Semester Options',
        cancelable: true,
        buttons: [
          'Add requirement',
          'Change description',
          'Rename',
          'Move left',
          'Move right',
          {
            label: 'Delete',
            modifier: 'destructive'
          },
          'Close'
        ]
      }).then(function(index){
        if(index == 0)
          $scope.addReq();
        else if(index == 1)
          $scope.changeDescription();
        else if(index == 2)
          $scope.rename();
        else if(index == 3)
          $scope.moveLeft();
        else if(index == 4)
          $scope.moveRight();
        else if(index == 5)
          $scope.delete();
      })
  }

  $scope.moveLeft = function() {
    //Find degrees's index
    var pos = getDegreeIdx($scope.chosen.ID);

    //Prevent degree from going out of bounds
    if (pos <= 0)
      return;

    //Move indices of degrees
    var hold = $scope.degrees[pos-1];
    $scope.degrees[pos-1] = $scope.chosen;
    $scope.degrees[pos] = hold;

    $scope.dirty();
  }

  $scope.moveRight = function() {
    //Find degrees's index
    var pos = getDegreeIdx($scope.chosen.ID);

    //Prevent degree from going out of bounds
    if (pos + 1 >= $scope.degrees.length)
      return;

    //Move indices of degrees
    var hold = $scope.degrees[pos+1];
    $scope.degrees[pos+1] = $scope.chosen;
    $scope.degrees[pos] = hold;

    $scope.dirty();
  }

  $scope.moveUp = function(ID, degree) {
    //Find degrees's index
    var dPos = getDegreeIdx(degree);

    //Find req's index
    var rPos = getReqIdx(ID, dPos);

    //Out of bounds check
    if(rPos == 0)
      return;

    //Switch
    var current = $scope.degrees[dPos].reqs[rPos];
    $scope.degrees[dPos].reqs[rPos] = $scope.degrees[dPos].reqs[rPos - 1];
    $scope.degrees[dPos].reqs[rPos - 1] = current;

    $scope.dirty();
  }

  $scope.moveDown = function(ID, degree) {
    //Find degrees's index
    var dPos = getDegreeIdx(degree);

    //Find req's index
    var rPos = getReqIdx(ID, dPos);

    //Out of bounds check
    if(rPos == $scope.degrees[dPos].reqs.length - 1)
      return;

    //Switch
    var current = $scope.degrees[dPos].reqs[rPos];
    $scope.degrees[dPos].reqs[rPos] = $scope.degrees[dPos].reqs[rPos + 1];
    $scope.degrees[dPos].reqs[rPos + 1] = current;

    $scope.dirty();
  }

  $scope.pl = function(hours){
    if(hours > 1)
      return "s";
  }

  $scope.recalculate = function() {
    //Resize window if necessary
    var desktopSize = Math.max(40*$scope.degrees.length, 100);
        desktopSize += "%";
    var mobileSize = window.innerWidth*$scope.degrees.length+"px";
    var chosenSize = (isMobile() ? mobileSize : desktopSize);
    angular.element(document.querySelector('#expandable')).attr("style","width:"+chosenSize);

    //Determine coloration
    $scope.reqStatus();

    //Loop through all degrees calculating info
    angular.forEach($scope.degrees, function(degree){
      degree.value = 0;
      degree.secondary = 0;
      degree.total = 0;

      //Add up total required hours
      angular.forEach(degree.reqs, function(req){
        degree.total += parseInt(req.hours);

        var value = 0;
        var secondary = 0;

        //Add up total met hours
        angular.forEach(req.satisfy, function(satisfy){
          var course = getCourse(satisfy);
          var semester = parseInt(course.col);

          //Class has been taken
          if(semesters[semester].completed){
            value += parseInt(course.hours);
          }
          //Class hasn't been sorted yet
          else if(semester == semesters.length - 1){}
          //Class has been planned
          else{
            secondary += parseInt(course.hours);
          }
        });

        //Check whether completed satisfying courses exceed max
        var min = Math.min(req.hours, value);
        degree.value += min;

        //Check whether pending satisfying courses exceed max
        degree.secondary += Math.min(req.hours - min, secondary);
      })

      //Divison by zero check
      if(degree.total == 0)
        return;

      //Save number of planned hours; calculate percentage
      degree.planned = degree.secondary;
      degree.planned /= degree.total;
      degree.planned *= 100;
      degree.planned = Math.min(100,Math.round(degree.planned));

      //Get total number of hours
      degree.secondary += degree.value;

      //Calculate percentage
      degree.value /= degree.total;
      degree.value *= 100;
      degree.value = Math.round(degree.value);

      //Calculate percentage
      degree.secondary /= degree.total;
      degree.secondary *= 100;
      degree.secondary = Math.round(degree.secondary);
    });
  }

  $scope.rename = function(ID) {
    //Allow degree to be renamed
    ons.notification.prompt({message: "Renaming: " + $scope.chosen.name, cancelable: 'true'})
      .then(function(newName) {
          //Bad input check
          if(newName == null || newName.trim() == "")
            return;

          $scope.chosen.name = newName;
          $scope.dirty();
      })
      .catch(function(){
        return true;
      });
  }

  $scope.reqStatus = function(req) {
    angular.forEach($scope.degrees, function(degree){
      angular.forEach(degree.reqs, function(req){
        var hours = parseInt(req.hours);
        var met = 0;
        var satisfied = 0;
        angular.forEach(req.satisfy, function(courseID){
          var course = getCourse(courseID);
          met += parseInt(course.hours);

          if(semesters[course.col].completed || course.col < semesters.length - 1)
            satisfied += parseInt(course.hours);
        });
        //If requirements haven't been fully set
        if(met < hours){
          req.reqColor = "#ff6c6c";
          req.warning = 2;
        }
        //If satisfying courses haven't been scheduled
        else if(satisfied < hours){
          req.reqColor = "#ff7950";
          req.warning = 1;
        }
        //Everything met
        else{
          req.reqColor = "#333333";
          req.warning = 0;
        }
      })
    })
  }

  $scope.showDetails = function(ID){
    $scope.message = getCourse(ID).notes;
    ons.createPopover('popoverUp.html', { parentScope: $scope})
    .then(function(popover){
      popover.show(event);
    });
  }

  $scope.update = function() {
    $scope.recalculate();

    //Save to global vars
    degrees = $scope.degrees;

    $timeout(50);
  }

  $scope.refresh = function() {
    //Pull new data
    $scope.saved = Data.saved;
    $scope.degrees = degrees;

    //Update display
    $scope.recalculate();
    $timeout(50);
  }
}])

.controller('SemesterCtrl', ['$scope', '$timeout', 'Data', function($scope, $timeout, Data) {
  $scope.chosen = null;
  $scope.semesters = angular.copy(semesters);
  $scope.courses = angular.copy(courses);
  serialized = angular.toJson(courses);
  $scope.saved = Data.saved;
  $scope.name = name;

  $scope.gridsterOpts = {
    columns: $scope.semesters.length, // the width of the grid, in columns
    pushing: true, // whether to push other items out of the way on move or resize
    floating: true, // whether to automatically float items up so they stack (you can temporarily disable if you are adding unsorted items with ng-repeat)
    swapping: false, // whether or not to have items of the same size switch places instead of pushing down if they are the same size
    width: 'auto', // can be an integer or 'auto'. 'auto' scales gridster to be the full width of its containing element
    colWidth: 'auto', // can be an integer or 'auto'.  'auto' uses the pixel width of the element divided by 'columns'
    rowHeight: 65, // can be an integer or 'match'.  Match uses the colWidth, giving you square widgets.
    margins: [5, 5], // the pixel distance between each widget
    outerMargin: true, // whether margins apply to outer edges of the grid
    sparse: false, // "true" can increase performance of dragging and resizing for big grid (e.g. 20x50)
    isMobile: false, // stacks the grid items if true
    mobileBreakPoint: 600, // if the screen is not wider that this, remove the grid layout and stack the items
    mobileModeEnabled: true, // whether or not to toggle mobile mode when screen width is less than mobileBreakPoint
    minColumns: 1, // the minimum columns the grid must have
    minRows: 1, // the minimum height of the grid, in rows
    maxRows: 100,
    defaultSizeX: 1, // the default width of a gridster item, if not specifed
    defaultSizeY: 1, // the default height of a gridster item, if not specified
    minSizeX: 1, // minimum column width of an item
    maxSizeX: null, // maximum column width of an item
    minSizeY: 1, // minumum row height of an item
    maxSizeY: null, // maximum row height of an item
    resizable: {
       enabled: false
    },
    draggable: {
       enabled: !isMobile() // whether dragging items is supported
    }
  };

  $scope.init = function() {
    console.log("semester init");

    $scope.update();

    $scope.$watch('courses', function(n, o){
      //Check for dirtiness
      if(serialized !== angular.toJson($scope.courses)){
        $scope.dirty();
      }
    }, true);

    //Watch for changes in all data
    Data.registerObserver(refresh);

    //Notify Gridster is disabled
    if(isMobile()){
      document.querySelector('ons-toast').show();
      $timeout(function(){ document.querySelector('ons-toast').hide(); }, 3000);
    }
    //Notify semester buttons features
    else{
      document.getElementById("semesterToast").show();
      $timeout(function(){ document.getElementById("semesterToast").hide(); }, 3000);
    }

    //Notify of speed dial location
    if($scope.semesters.length <= 1 || $scope.courses.length == 0)
      speedDial($scope, "Click here to add a semester or class");
  }

  $scope.addCourse = function() {
    //No pre-update of global vars necessary

    //Input dialog
    addCourse();

    promise.then(function(ID){
      if(ID != null){
        //Set dirty
        Data.dirty();

        //Allow modification
        nav.pushPage('html/course.html', {data: {course: ID}});
      }
    });
  }

  $scope.addSemester = function() {
    ons.notification.prompt({message: "Semester Name", cancelable: true})
       .then(function(name) {
          //Bad input check
          if(name == null || name.trim() == "")
            return;

          //Create semester object
          var semester = {
            name: name,
            completed: 0,
            hours: 0
          };

          //Save "Unsorted" category for adjustments
          $scope.chosen = semester;

          //Insert new semester at end
          $scope.semesters.push(semester);

          //Update size of grid
          $scope.gridsterOpts.columns = $scope.semesters.length;

          //Update display
          $scope.dirty();

          //Reposition new semester so "Unsorted" is at the end
          $scope.moveLeft();
       })
       .catch(function(){
        return true;
       });
  }

  $scope.delete = function() {
    //Get index of semester
    var pos = $scope.semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Reorder all courses:
    //  1) Courses above current index must decrement once
    //  2) Orphaned courses in this index must move to "Unsorted"
    var newCourses = angular.copy($scope.courses);
    angular.forEach(newCourses, function(course) {
      //Send courses of this semester to "Unsorted"
      if(course.col == pos)
        course.col = $scope.semesters.length - 2;
      //Reposition semesters to the right
      else if(course.col > pos)
        course.col--;
    })
    $scope.courses = newCourses;

    //Remove semester from list of semesters
    $scope.semesters.splice(pos, 1);

    //Update Gridster
    $scope.gridsterOpts.columns = $scope.semesters.length;

    $scope.dirty();
  }

  $scope.dirty = function() {
    $scope.update();
    Data.dirty();
  }

  $scope.flipStatus = function() {
    $scope.chosen.completed = !$scope.chosen.completed*1;
    $scope.dirty();
  }

  $scope.modifySemester = function(semester) {
    //Create popup to allow semester modification
    if(semester.name != "Unsorted") {
        $scope.chosen = semester;

        var string = ($scope.chosen.completed ? "Mark incomplete" : "Mark complete");
        
        ons.openActionSheet({
          title: 'Semester Options',
          cancelable: true,
          buttons: [
            'Rename',
             string,
            'Move left',
            'Move right',
            {
              label: 'Delete',
              modifier: 'destructive'
            },
            'Close'
          ]
        }).then(function(index){
          if(index == 0)
            $scope.rename();
          else if(index == 1)
            $scope.flipStatus();
          else if(index == 2)
            $scope.moveLeft();
          else if(index == 3)
            $scope.moveRight();
          else if(index == 4)
            $scope.delete();
        })
    }
  }

  $scope.moveLeft = function() {
    //Find semester's index
    var pos = $scope.semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Prevent semester from going out of bounds
    if (pos <= 0)
      return;

    //Move indices of semesters
    var hold = $scope.semesters[pos-1];
    $scope.semesters[pos-1] = $scope.chosen;
    $scope.semesters[pos] = hold;

    //Move classes with moved semesters
    var newCourses = angular.copy($scope.courses);
    angular.forEach(newCourses, function(course) {
      if(course.col == pos)
        course.col--;
      else if(course.col == pos - 1)
        course.col++;
    });
    $scope.courses = newCourses;

    $scope.dirty();
  }

  $scope.moveRight = function() {
    //Find semester's index
    var pos = $scope.semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Prevent category from replacing rightmost "Unsorted" column
    if(pos + 2 >= $scope.semesters.length)
      return;

    //Move indices of semesters
    var hold = $scope.semesters[pos+1];
    $scope.semesters[pos+1] = $scope.chosen;
    $scope.semesters[pos] = hold;

    //Move classes with moved semesters
    var newCourses = angular.copy($scope.courses);
    angular.forEach(newCourses, function(course) {
      if(course.col == pos)
        course.col++;
      else if(course.col == pos + 1)
        course.col--;
    })
    $scope.courses = newCourses;

    $scope.dirty();
  }

  $scope.recalculate = function() {
    //Recalculate width of page
    var desktopSize = Math.max(20*$scope.semesters.length, 100);
        desktopSize += "%";
    var mobileSize = window.innerWidth*$scope.semesters.length+"px";
    var chosenSize = (isMobile() ? mobileSize : desktopSize);
    angular.element(document.querySelector('#expandable')).attr("style","width:"+chosenSize);

    //Reset hours for each semester
    angular.forEach($scope.semesters, function(semester) {
      semester.hours = 0;
    })

    //Calculate new hour totals
    angular.forEach($scope.courses, function(course) {
      $scope.semesters[course.col].hours += course.hours*1;
      course.row = course.row;
    });
  }

  $scope.rename = function() {
    //Allow semester to be renamed
    ons.notification.prompt({message: "Renaming: " + $scope.chosen.name, cancelable: 'true'})
      .then(function(newName) {
          //Bad input check
          if(newName == null || newName.trim() == "")
            return;

          $scope.chosen.name = newName;
          $scope.dirty();
      })
      .catch(function(){
        return true;
      });
  }

  $scope.update = function() {
    //Update global variables
    semesters = angular.copy($scope.semesters);
    courses = angular.copy($scope.courses);

    //Update display
    $scope.recalculate();

    //Update display
    $timeout(50);
  }

  var refresh = function() {
    //Pull new data
    $scope.saved = Data.saved;
    $scope.semesters = angular.copy(semesters);
    $scope.courses = angular.copy(courses);
    serialized = angular.toJson(courses);

    //Update display
    $scope.update();
  }
}])

.controller('ShareCtrl', ['$scope', '$timeout', 'Data', function($scope, $timeout, Data) {
  $scope.shareId = Data.getId();

  $scope.init = function() {
    Data.registerObserver($scope.refresh);
    Data.listPermissions();
  }

  $scope.copy = function() {
    document.getElementById("shareInput")._input.select();
    document.execCommand("copy");
    document.getSelection().removeAllRanges();

    //Notify link copied
    document.getElementById("shareToast").show();
    $timeout(function(){ document.getElementById("shareToast").hide(); }, 5000);
  }

  $scope.makePrivate = function() {
    Data.makePrivate();
  }

  $scope.makePublic = function() {
    Data.makePublic();
  }

  $scope.refresh = function() {
    $scope.public = Data.public;
      $timeout(function(){
        angular.element(document.querySelector('#shareButton')).attr("disabled",Data.sharing());
      });
  }
}])

.controller("SettingsCtrl", ['$scope', 'GAuth', 'Data', function($scope, GAuth, Data) {
  $scope.init = function() {
  }

  $scope.export = function() {
    var b = document.getElementById("exportButton");
    b.download = "data.json";
    b.textContent = "data.json";
    b.href = 'data:application/json;base64,'+window.btoa(unescape(encodeURIComponent(updateData())));
  }

  $scope.delete = function() {
    angular.element(document.querySelector('#delButton')).attr("disabled","true");
    Data.destroy(false);
  }

  $scope.logout = function() {
    GAuth.logout();
  }
}])

//Directive to auto-focus for CourseCtrl
.directive('focusMe', function($timeout, $parse) {
  return {
    link: function(scope, element, attrs) {
      var model = $parse(attrs.focusMe);
      scope.$watch(model, function(value) {
        if(value === true) { 
          $timeout(function() {
            element[0]._input.focus(); 
          });
        }
      });
    }
  };
})

//Allow Enter key to be used to submit form
.directive('ngEnter', function() {
  return function(scope, element, attrs) {
    element.bind("keydown keypress", function(event) {
      if(event.which === 13) {
        scope.$apply(function(){
          scope.$eval(attrs.ngEnter, {'event': event});
        });

        event.preventDefault();
      }
    });
  };
})

;
