var getRand = function() {
  return Date.now();
}

var degrees;

var getDegreePos = function(ID) {
  return degrees.map(function(e) { return e.ID; }).indexOf(ID);
}

var getReqPos = function(ID, degreePos) {
  return degrees[degreePos].reqs.map(function(e) { return e.ID; }).indexOf(ID);
}

var semesters;

var courses;

var getCourse = function(ID) {
  return courses[courses.map(function(e) { return e.ID; }).indexOf(ID)];
}

var updateData = function() {
  //Convert relevant data to string
  var dataD = angular.toJson(degrees);
  var dataS = angular.toJson(semesters);
  var dataC = angular.toJson(courses);

  //Parse data together
  return dataD + "\n" + dataS + "\n" + dataC;
}

var orderObjectBy = 
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

angular.module('myApp')

.controller('MainCtrl', ['$scope', function($scope) {
  $scope.nav.pushPage('principal.html');
}])

.controller('Menu', ['$scope', 'Data', function($scope, Data) {
  $scope.saved = 2;

  $scope.load = function(page) {
    content.load(page).then(function() {
        menu.left.close();
      });
  };

  $scope.init = function() {
    Data.registerObserver(saveStatus);
  }

  $scope.save = function() {
    Data.save(updateData());
  }

  var saveStatus = function() {
    $scope.saved = Data.saved;
  }

}])

.controller("LoginCtrl", function($scope, $timeout, GAuth, Data) {
  $scope.init = function (){
    if(!GAuth.loginStatus())
      GAuth.registerObserver(loginStatus);
    else
      loginStatus();
  }

  var loginStatus = function(){
    $scope.loggedIn = GAuth.loginStatus();
    Data.registerObserver(parseData);
    Data.pull();
  }

  var parseData = function() {
    Data.deregister(parseData);

    var str = (Data.fileData ? Data.fileData.split("\n") : [null, null, null]);

    degrees = (str[0] && str[0] != undefined ? json_parse(str[0]) : []);

    semesters = (str[1] && str[1] != undefined ? json_parse(str[1]) : []);

    courses = (str[2] && str[2] != undefined ? json_parse(str[2]) : []);
  }
})

.controller("CourseCtrl", ['$scope', '$timeout', 'Data', function($scope, $timeout, Data){
  $scope.init = function(){
    $timeout($scope.initialize, 50);
  }

  $scope.initialize = function() {
    $scope.old = nav.topPage.data.course;
    $scope.course = angular.copy(nav.topPage.data.course);
  }


  $scope.close = function() {
    nav.popPage();
  }

  $scope.delete = function() {
    //Remove course from array
    var pos = courses.indexOf($scope.old);
    courses.splice(pos, 1);

    //Save changes to file
    Data.save(updateData());

    //Pop page
    $scope.close();
  }

  $scope.save = function() {
    //Check if course was modified
    if(angular.equals($scope.old, $scope.course))
      return;

    //Overwrite old course if applicable
    var pos = courses.indexOf($scope.old);
    courses[pos] = $scope.course;

    //Save changes to file
    Data.save(updateData());

    //Pop page
    $scope.close();
  }
}])

.controller("CoursesCtrl", function($scope, $timeout, Data) {
  $scope.courses = courses;
  $scope.ordered = orderObjectBy($scope.courses, 'abbr');
  $scope.backButton = false;

  $scope.init = function() {
    $timeout(initialize, 500);
  }

  var initialize = function() {
    if(nav.topPage.data.actionable != undefined)
      $scope.backButton = true;
    Data.registerObserver($scope.refresh);
  }

  $scope.CourseDelegate = {
    configureItemScope: function(index, itemScope) {
      itemScope.course = $scope.ordered[index];
      itemScope.abbr = $scope.ordered[index].abbr;
      itemScope.name = $scope.ordered[index].name;
      itemScope.hours = $scope.ordered[index].hours;
      if(itemScope.hours > 1)
        itemScope.pl = "s";
    },
    calculateItemHeight: function(index) {
      return 44;
    },
    countItems: function() {
      return $scope.courses.length;
    }
  }

  $scope.action = function(chosen) {
    if(nav.topPage.data.actionable){
      nav.topPage.data.actionable(
                  nav.topPage.data.degPos,
                  nav.topPage.data.reqPos,
                  chosen.ID);
      Data.save(updateData());
      nav.popPage();
    }

    else
      $scope.editCourse(chosen);
  }

  $scope.editCourse = function(chosen) {
    nav.pushPage('html/course.html', { data : { course: chosen } });
  }

  $scope.refresh = function() {
    $scope.ordered = orderObjectBy(courses, 'abbr');
    $scope.CourseDelegate.refresh();
  }
})

.controller("ReqCtrl", ['$scope', '$timeout', 'Data', function($scope, $timeout, Data){
  $scope.degrees = null;

  $scope.init = function() {
    $timeout(initialize, 50);
  }

  var initialize = function() {
    $scope.degrees = degrees;

    $scope.reqPos = nav.topPage.data.reqPos;
    $scope.degPos = nav.topPage.data.degPos;
  
    $scope.req = angular.copy($scope.degrees[$scope.degPos].reqs[$scope.reqPos]);
    $scope.old = angular.copy($scope.req);

    Data.registerObserver(watchChanges);
  }

  var action = function(degPos, reqPos, courseID) {
    //Function to allow course to be added to this req
    if(degrees[degPos].reqs[reqPos].satisfy.indexOf(courseID) < 0)
      degrees[degPos].reqs[reqPos].satisfy.push(courseID);
  }

  $scope.addCourse = function() {
    var newCourse = {
      sizeX: 1,
      sizeY: 1,
      row: 0,
      col: semesters.length - 1,
      ID: getRand(),
      abbr: "",
      name: "",
      hours: 3
    };

    //Get basic information
    ons.notification.prompt({message: "Course Abbreviation", cancelable: true})
      .then(function(abbr) {
        //Update course
        newCourse.abbr = abbr;

        //Insert new course at end
        courses.push(newCourse);

        //Set dirty and update global data
        Data.dirty();

        //Allow modification
        nav.pushPage('html/course.html', {data: {course: newCourse}});
      })
      .catch(function(){
        return true;
      });
  }

  $scope.pushClass = function() {
    nav.pushPage("html/courses.html", {data: {actionable: action, degPos: $scope.degPos, reqPos: $scope.reqPos}});
  }

  $scope.course = function(ID) {
    $scope.chosen = getCourse(ID);
  }

  $scope.close = function() {
    nav.popPage();
  }

  $scope.delete = function() {
    //Splice req out of array
    $scope.degrees[$scope.degPos].reqs.splice($scope.reqPos, 1);

    //Save changes to file
    Data.save(updateData());

    $scope.close();
  }

  $scope.pl = function() {
    if($scope.chosen.hours > 1)
      return "hrs";
    return "hr";
  }

  $scope.rmClass = function(ID) {
    var pos = $scope.req.satisfy.indexOf(ID);
    $scope.req.satisfy.splice(pos, 1);

    //Overwrite local var
    $scope.degrees[$scope.degPos].reqs[$scope.reqPos] = $scope.req;

    //Overwrite global var
    degrees = $scope.degrees;
  }

  $scope.save = function() {
    //Check if modified
    if(angular.equals($scope.old, $scope.req)){
      $scope.close();
      return;
    }

    //Overwrite old var
    degrees = $scope.degrees;

    //Save changes to file
    Data.save(updateData());

    $scope.close();
  }

  var watchChanges = function() {
    console.log("getting changes");
    $scope.degrees = degrees;
    $scope.req = $scope.degrees[$scope.degPos].reqs[$scope.reqPos];
  }
}])

.controller('DegreeCtrl', ['$scope', '$timeout', 'Data', function($scope, $timeout, Data) {
  $scope.chosen = null;
  $scope.degrees = null;
  $scope.reqs = [];
  $scope.courses = null;
  $scope.saved = Data.saved;
  $scope.class = null;
  $scope.status = 0;

  $scope.init = function() {
    if(Data.fileData)
      initialize();
    else
      Data.registerObserver(initialize);
  }

  var initialize = function() {
    console.log("degree init");
    Data.deregister(initialize);

    $scope.degrees = degrees;
    $scope.courses = courses;

    //Calculate degree percentages
    $scope.recalculate();

    //Update display
    $timeout(50);

    $scope.$watch('courses', function(n, o){
      //Check for dirtiness
      if(n != o)
        $scope.dirty();
      //Update display
      $scope.update();
    }, true);

    //Watch for changes in all data
    Data.registerObserver(watchChanges);
  }

  $scope.addCourse = function() {
    var newCourse = {
      sizeX: 1,
      sizeY: 1,
      row: 0,
      col: semesters.length - 1,
      ID: getRand(),
      abbr: "",
      name: "",
      hours: 3
    };

    //Get basic information
    ons.notification.prompt({message: "Course Abbreviation", cancelable: true})
      .then(function(abbr) {
        //Update course
        newCourse.abbr = abbr;

        //Insert new course at end
        $scope.courses.push(newCourse);

        //Set dirty and update global data
        $scope.dirty();

        //Allow modification
        nav.pushPage('html/course.html', {data: {course: newCourse}});
      })
      .catch(function(){
        return true;
      });
  }

  $scope.addDegree = function() {
    ons.notification.prompt({message: "Degree Name", cancelable: true})
       .then(function(name) {
          //Create degree object
          var degree = {
            ID: getRand(),
            name: name,
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

    //Close popover
    popover.hide();

    //Get title of requirement
    ons.notification.prompt({message: "Requirement", cancelable: true})
      .then(function(title) {
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

  $scope.course = function(ID) {
    $scope.class = getCourse(ID);
    //Check when course was taken
    var semester = $scope.class.col;
    //Course has been completed
    if(semesters[semester].completed){
      $scope.status = 0;
      $scope.color = "#75d3d1";
    }
    //Course has not been scheduled
    else if(semester == semesters.length - 1){
      $scope.status = 2;
      $scope.color = "#ff7950";
    }
    //Course has been scheduled
    else{
      $scope.status = 1;
      $scope.color = "#a6a6a6";
    }
  }

  $scope.editReq = function(ID, degree) {
    //Get information
    var degreePos = getDegreePos(degree);

    //Push page for editing
    nav.pushPage("html/req.html", {data: { degPos: degreePos, reqPos: getReqPos(ID, degreePos) }});
  }

  $scope.delete = function() {
    //Remove degree from list of degrees
    var pos = getDegreePos($scope.chosen.ID);
    $scope.degrees.splice(pos, 1);

    //Close popover
    popover.hide();

    $scope.dirty();
  }

  $scope.dirty = function() {
    $scope.update();
    Data.dirty();
  }

  $scope.modifyDegree = function(degree) {
      $scope.chosen = degree;
      popover.show(event);
  }

  $scope.moveLeft = function() {
    //Find degrees's index
    var pos = getDegreePos($scope.chosen.ID);

    //Prevent degree from going out of bounds
    if (pos > 0) {
      //Move indices of degrees
      var hold = $scope.degrees[pos-1];
      $scope.degrees[pos-1] = $scope.chosen;
      $scope.degrees[pos] = hold;

      $scope.dirty();
    }
  }

  $scope.moveRight = function() {
    //Find degrees's index
    var pos = getDegreePos($scope.chosen.ID);

    //Prevent degree from going out of bounds
    if (pos + 1 < $scope.degrees.length) {

      //Move indices of degrees
      var hold = $scope.degrees[pos+1];
      $scope.degrees[pos+1] = $scope.chosen;
      $scope.degrees[pos] = hold;

      $scope.dirty();
    }
  }

  $scope.moveUp = function(ID, degree) {
    //Find degrees's index
    var pos = getDegreePos(degree);

    //Find req's index
    var rPos = getReqPos(ID, pos);

    //Out of bounds check
    if(rPos == 0)
      return;

    //Switch
    var current = $scope.degrees[pos].reqs[rPos];
    $scope.degrees[pos].reqs[rPos] = $scope.degrees[pos].reqs[rPos - 1];
    $scope.degrees[pos].reqs[rPos - 1] = current;

    $scope.dirty();
  }

  $scope.moveDown = function(ID, degree) {
    //Find degrees's index
    var pos = getDegreePos(degree);

    //Find req's index
    var rPos = getReqPos(ID, pos);

    //Out of bounds check
    if(rPos == $scope.degrees[pos].reqs.length - 1)
      return;

    //Switch
    var current = $scope.degrees[pos].reqs[rPos];
    $scope.degrees[pos].reqs[rPos] = $scope.degrees[pos].reqs[rPos + 1];
    $scope.degrees[pos].reqs[rPos + 1] = current;

    $scope.dirty();
  }

  $scope.pl = function(hours){
    if(hours > 1)
      return "hrs";
    return "hr";
  }

  $scope.recalculate = function() {
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
          $scope.chosen.name = newName;
          $scope.dirty();
      })
      .catch(function(){
        return true;
      });

    //Close popover
    popover.hide();
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
        else{
          req.reqColor = "#333333";
          req.warning = false;
        }
      })
    })
  }

  $scope.update = function() {
    $scope.recalculate();

    degrees = $scope.degrees;

    $timeout(50);
  }

  var watchChanges = function() {
    $scope.saved = Data.saved;

    $scope.recalculate();
  }
}])

// Controller for package form
.controller('SemesterCtrl', ['$scope', '$timeout', 'Data', function($scope, $timeout, Data) {
  $scope.chosen = null;
  $scope.semesters = null;
  $scope.courses = null;
  $scope.saved = Data.saved;

  $scope.gridsterOpts = {
    columns: 1, // the width of the grid, in columns
    pushing: true, // whether to push other items out of the way on move or resize
    floating: true, // whether to automatically float items up so they stack (you can temporarily disable if you are adding unsorted items with ng-repeat)
    swapping: false, // whether or not to have items of the same size switch places instead of pushing down if they are the same size
    width: 'auto', // can be an integer or 'auto'. 'auto' scales gridster to be the full width of its containing element
    colWidth: 'auto', // can be an integer or 'auto'.  'auto' uses the pixel width of the element divided by 'columns'
    rowHeight: 50, // can be an integer or 'match'.  Match uses the colWidth, giving you square widgets.
    margins: [10, 10], // the pixel distance between each widget
    outerMargin: true, // whether margins apply to outer edges of the grid
    sparse: false, // "true" can increase performance of dragging and resizing for big grid (e.g. 20x50)
    isMobile: false, // stacks the grid items if true
    mobileBreakPoint: 600, // if the screen is not wider that this, remove the grid layout and stack the items
    mobileModeEnabled: true, // whether or not to toggle mobile mode when screen width is less than mobileBreakPoint
    minColumns: 1, // the minimum columns the grid must have
    minRows: 2, // the minimum height of the grid, in rows
    maxRows: 100,
    defaultSizeX: 2, // the default width of a gridster item, if not specifed
    defaultSizeY: 1, // the default height of a gridster item, if not specified
    minSizeX: 1, // minimum column width of an item
    maxSizeX: null, // maximum column width of an item
    minSizeY: 1, // minumum row height of an item
    maxSizeY: null, // maximum row height of an item
    resizable: {
       enabled: false
    },
    draggable: {
       enabled: true, // whether dragging items is supported
       //start: function(event, $element, widget) {}, // optional callback fired when drag is started,
       //drag: function(event, $element, widget) {}, // optional callback fired when item is moved,
       //stop: function(event, $element, widget) { $scope.update(); } // optional callback fired when item is finished dragging
    }
  };

  $scope.init = function() {
    if(Data.fileData)
      initialize();
    else
      Data.registerObserver(initialize);
  }

  var initialize = function() {
    console.log("semester init");
    Data.deregister(initialize);

    $scope.semesters = semesters;
    $scope.courses = courses;

    //Set number of columns
    $scope.gridsterOpts.columns = ($scope.semesters.length ? $scope.semesters.length : 1);

    //Calculate semester total hours
    $scope.recalculate();

    //Update display
    $timeout(50);

    $scope.$watch('courses', function(n, o){
      //Update semester hours
      $scope.recalculate();

      //Check for dirtiness
      if(n != o)
        $scope.dirty();
      //Update display
      $scope.update();
    }, true);

    //Watch for changes in all data
    Data.registerObserver(watchChanges);
  }

  $scope.addCourse = function() {
    var newCourse = {
      sizeX: 1,
      sizeY: 1,
      row: 0,
      col: $scope.semesters.length - 1,
      ID: getRand(),
      abbr: "",
      name: "",
      hours: 3
    };

    //Get basic information
    ons.notification.prompt({message: "Course Abbreviation", cancelable: true})
      .then(function(abbr) {
        //Update course
        newCourse.abbr = abbr;

        //Insert new course at end
        $scope.courses.push(newCourse);

        //Set dirty and update global data
        $scope.dirty();

        //Allow modification
        nav.pushPage('html/course.html', {data: {course: newCourse}});
      })
      .catch(function(){
        return true;
      });
  }

  $scope.addSemester = function() {
    ons.notification.prompt({message: "Semester Name", cancelable: true})
       .then(function(name) {
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

          //Reposition "Unsorted" category to end
          $scope.moveLeft();
       })
       .catch(function(){
        return true;
       });
  }

  $scope.delete = function() {
    //Get position of semester
    var pos = $scope.semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Reorder all courses; move all orphaned courses to "Unsorted" category
    angular.forEach($scope.courses, function(course) {
      //Send courses of this semester to "Unsorted"
      if(course.col == pos)
        course.col = $scope.semesters.length - 1;
      //Reposition semesters to the right
      else if(course.col > pos)
        course.col--;
    })

    //Remove semester from list of semesters
    $scope.semesters.splice(pos, 1);

    //Update Gridster
    $scope.gridsterOpts.columns = $scope.semesters.length;

    //Close popover
    popover.hide();

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
        popover.show(event);
    }
  }

  $scope.moveLeft = function() {
    //Find semester's index
    var pos = $scope.semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Prevent semester from going out of bounds
    if (pos > 0) {

      //Move indices of semesters
      var hold = $scope.semesters[pos-1];
      $scope.semesters[pos-1] = $scope.chosen;
      $scope.semesters[pos] = hold;

      //Move classes with moved semesters
      angular.forEach($scope.courses, function(course) {
        if(course.col == pos)
          course.col--;
        else if(course.col == pos - 1)
          course.col++;
      });

      //Reposition popover?

      $scope.dirty();
    }
  }

  $scope.moveRight = function() {
    //Find semester's index
    var pos = $scope.semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Prevent category from replacing rightmost "Unsorted" column
    if(pos + 2 < $scope.semesters.length) {

      //Move indices of semesters
      var hold = $scope.semesters[pos+1];
      $scope.semesters[pos+1] = $scope.chosen;
      $scope.semesters[pos] = hold;

      //Move classes with moved semesters
      angular.forEach($scope.courses, function(course) {
        if(course.col == pos)
          course.col++;
        else if(course.col == pos + 1)
          course.col--;
      })

      //Reposition popover?

      $scope.dirty();
    }
  }

  $scope.recalculate = function() {
    //Reset hours for each semester
    angular.forEach($scope.semesters, function(semester) {
      semester.hours = 0;
    })

    //Calculate new totals
    angular.forEach($scope.courses, function(course) {
      if(course.col >= $scope.semesters.length)
        course.col--;
      $scope.semesters[course.col].hours += course.hours*1;
    })
  }

  $scope.rename = function() {
    //Allow semester to be renamed
    ons.notification.prompt({message: "Renaming: " + $scope.chosen.name, cancelable: 'true'})
      .then(function(newName) {
          $scope.chosen.name = newName;
          $scope.dirty();
      })
      .catch(function(){
        return true;
      });

    //Close popover
    popover.hide();
  }

  $scope.update = function() {
    //Update global variables
    semesters = $scope.semesters;
    courses = $scope.courses;

    //Update display
    $timeout(50);
  }

  var watchChanges = function() {
    $scope.saved = Data.saved;
  }
}])

.controller("SettingsCtrl", ['$scope', 'Data', function($scope, Data) {
  $scope.delete = function(){
    angular.element(document.querySelector('#delButton')).attr("disabled","true");
    Data.destroy();
  }
}])

;
