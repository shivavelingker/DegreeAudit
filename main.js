var Course = class Course{
  constructor (name, abbr, hours){
    this.title = name;
    this.abbr = abbr;
    this.hours = hours;
  }
  
  getHours(){
    return this.hours;
  }
};

var Semester = class Semester{
  constructor (name, pos){
    this.name = name;
    this.pos = pos;
    this.courses = [];
  }
  
  getName(){
    return this.name;
  }
  
  hours(){
    var hours = 0;
    for(var course in this.courses){
      hours += course.getHours();
    }
    return hours;
  }
};

var Degree = class Degree{
  constructor (name){
    this.name = name;
  }
};

var semesters = [];//[Semester("None",0), Semester("Before Fall 2015",1), Semester("Fall 2015",2), Semester("Spring 2016",3)];

ons.bootstrap()
  .controller('Semesters', function() {
    this.delegate = {
      configureItemScope: function(index, itemScope) {
        itemScope.semester = semesters[index].getName();
        itemScope.index = index;
      },
      countItems: function() {
        return semesters.length;
      },
      calculateItemHeight: function() {
        return ons.platform.isAndroid() ? 48 : 44;
      }
    };
  });
