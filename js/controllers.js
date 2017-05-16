var degrees;

var semesters;

var courses;

var updateData = function() {
  //Convert relevant data to string
  var dataD = angular.toJson(degrees);
  var dataS = angular.toJson(semesters);
  var dataC = angular.toJson(courses);

  //Parse data together
  return dataD + "\n" + dataS + "\n" + dataC;
}

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
    console.log("register saver");
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

.controller("CoursesCtrl", function($scope, $timeout) {
  $scope.courses = courses;

  $scope.CourseDelegate = {
    configureItemScope: function(index, itemScope) {
      itemScope.course = $scope.courses[index];
      itemScope.abbr = $scope.courses[index].abbr;
      itemScope.name = $scope.courses[index].name;
      itemScope.hours = $scope.courses[index].hours;
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

  $scope.$watch('courses', function(){
    $scope.CourseDelegate.refresh();
    courses = $scope.courses;
  }, true)

  $scope.editCourse = function(chosen){
    nav.pushPage('html/course.html', { data : { course: chosen } });
  }
})

.controller('DegreeCtrl', ['$scope', '$timeout', function($scope, $timeout) {
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

    Data.registerObserver(watchChanges);
  }

  $scope.addCourse = function() {
    var newCourse = {
      sizeX: 1,
      sizeY: 1,
      row: 0,
      col: $scope.semesters.length - 1,
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
        $scope.courses.splice($scope.courses.length, 0, newCourse);

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
    //Remove semester from list of semesters
    var pos = $scope.semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);
    $scope.semesters.splice(pos, 1);

    //Update Gridster
    $scope.gridsterOpts.columns = $scope.semesters.length;

    //Move all orphaned courses to "Unsorted" category
    angular.forEach($scope.courses, function(course) {
      if(course.col == pos)
        course.col = $scope.semesters.length;
    })

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

    //Prevent semesters from into negative indices of array
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
          $scope.update();
      })
      .catch(function(){
        return true;
      });

    $scope.dirty();
  }

  $scope.save = function() {
    //Make sure changes have been caught
    $scope.update();

    //Save changes to file
    Data.save(updateData());
  }

  $scope.update = function() {
    console.log("call update");
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
