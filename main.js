window.fn = {};
semesters = ["Before Fall 2015", "Fall 2015", "Spring 2016"];

window.fn.open = function() {
  var menu = document.getElementById('menu');
  menu.open();
};

window.fn.load = function(page) {
  var content = document.getElementById('content');
  var menu = document.getElementById('menu');
  content.load(page)
    .then(menu.close.bind(menu));
};

window.fn.newCourse = function() {
  //document.getElementById('s0').checked = true;
  //Set up all semesters
  var section = document.getElementById("semesters");
  
  var listItem = document.createElement("ons-list-item");
  //Make tappable
  var radioLabel = document.createElement("label");
  //Class=left
  listItem.appendChild(radioLabel);
  var semesterLabel = document.createElement("label");
  listItem.appendChild(semesterLabel);
  //For #, Class=center
  
  for(var i in semesters){
    alert(i);
    semesterLabel.innerHtml = semesters[i];
    alert("next");
    section.append(listItem);
    alert("done");
  }
};