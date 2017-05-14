var degrees = [
  {
    "name": "Common Core",
    "reqs": [
        {
          "title": "Art",
          "hours": 3,
          "fulfill": ""
        }
    ]
  },
  {
    "name": "Computer Science BSA",
    "reqs": [
        {
          "title": "Theory 2", 
          "hours": 3,
          "fulfill": "CS 331"
        }
    ]
  }
];

var semesters = [
  {
    name: "Before 2015",
    completed: 1
  },
  {
    name: "Fall 2015",
    completed: 1
  },
  {
    name: "Spring 2016",
    completed: 1
  },
  {
    name: "Fall 2016",
    completed: 1
  },
  {
    name: "Spring 2017",
    completed: 0
  },
  {
    name: "Unsorted",
    completed: 0
  }
];

var courses = [
  { sizeX: 1, sizeY: 1, row: 0, col: 0, name: "1"},
  { sizeX: 1, sizeY: 1, row: 0, col: 2, name: "2"},
  { sizeX: 1, sizeY: 1, row: 0, col: 4, name: "3"},
  { sizeX: 1, sizeY: 1, row: 0, col: 5, name: "4"},
  { sizeX: 1, sizeY: 1, row: 1, col: 0, name: "5"},
  { sizeX: 1, sizeY: 1, row: 1, col: 4, name: "6"},
  { sizeX: 1, sizeY: 1, row: 1, col: 5, name: "7"},
  { sizeX: 1, sizeY: 1, row: 2, col: 0, name: "8"},
  { sizeX: 1, sizeY: 1, row: 2, col: 1, name: "9"},
  { sizeX: 1, sizeY: 1, row: 2, col: 3, name: "0"},
  { sizeX: 1, sizeY: 1, row: 2, col: 4, name: "11"}
];

angular.module('myApp')

// Controller for package form
.controller('SemesterCtrl', ['$scope', '$timeout', function($scope, $timeout) {
  $scope.chosen = null;
  $scope.semesters = semesters;
  $scope.courses = courses;

  $scope.gridsterOpts = {
    columns: semesters.length, // the width of the grid, in columns
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
       stop: function(event, $element, widget) { $scope.update(); } // optional callback fired when item is finished dragging
    }
  };

  $scope.init = function() {
    return true;
  }

  $scope.add = function() {
    ons.notification.prompt({message: "Semester Name", cancelable: true})
       .then(function(name) {
          //Create semester object
          var semester = {
            name: name,
            completed: 0
          };

          //Insert object before "Unsorted" category
          semesters.splice(semesters.length - 1, 0, semester);
          $scope.gridsterOpts.columns = semesters.length;

          $scope.update();
       })
       .catch(function(){
        return true;
       });
  }

  $scope.delete = function() {
    //Remove semester from list of semesters
    var pos = semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);
    semesters.splice(pos, 1);

    //Move all orphaned courses to "Unsorted" category
    angular.forEach(courses, function(course) {
      if(course.col == pos)
        course.col = semesters.length;
    })

    $scope.update();
  }

  $scope.flipStatus = function() {
    $scope.chosen.completed = !$scope.chosen.completed*1;

    $scope.update();
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
    var pos = semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Prevent semesters from into negative indices of array
    if (pos != 0) {
      //Move indices of objects
      var hold = semesters[pos-1];
      semesters[pos-1] = $scope.chosen;
      semesters[pos] = hold;

      //Move classes with moved semesters
      angular.forEach(courses, function(course) {
        if(course.col == pos)
          course.col--;
        else if(course.col == pos - 1)
          course.col++;
      });

      $scope.update();
    }
  }

  $scope.moveRight = function() {
    //Find semester's index
    var pos = semesters.map(function(e) { return e.name; }).indexOf($scope.chosen.name);

    //Prevent category from replacing rightmost "Unsorted" column
    if(pos + 2 != semesters.length) {
      //Move indices of objects
      var hold = semesters[pos+1];
      semesters[pos+1] = $scope.chosen;
      semesters[pos] = hold;

      //Move classes with moved semesters
      angular.forEach(courses, function(course) {
        if(course.col == pos)
          course.col++;
        else if(course.col == pos + 1)
          course.col--;
      })

      $scope.update();
    }
  }

  $scope.rename = function() {
    //Allow semester to be renamed
    ons.notification.prompt({message: "Renaming: "+$scope.chosen.name, cancelable: 'true'})
      .then(function(newName) {
          $scope.chosen.name = newName;
          $scope.update();
      })
      .catch(function(){
        return true;
      });
  }

  $scope.update = function() {
    //Update display
    $timeout(50);

    console.log("update");
  }
}])

;
