document.addEventListener('init', function(event) {
  var page = event.target;

  if (page.id === 'main') {
    page.querySelector('#degrees').onclick = function() {
      document.querySelector('#App').pushPage('degrees.html', {data: {title: 'hi'}});
    };
    page.querySelector('#years').onclick = function() {
      document.querySelector('#App').pushPage('years.html', {data: {title: 'bye'}});
    };
  }
});