var semesters = ['None', 'Before Fall 2015', 'Fall 2015', 'Spring 2016', 'Fall 2017'];

ons.bootstrap()
  .controller('Semesters', function() {
    this.delegate = {
      configureItemScope: function(index, itemScope) {
        itemScope.semester = semesters[index];
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
