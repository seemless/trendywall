var geWidget;
google.load("earth", "1");

function geNewPoint(instance, opts) {
  // opts:
  // opts.lat - latitude
  // opts.lon - Longitude
  // opts.flyTo - fly to point?
  // opts.iconHref - href of custom icon
  // opts.balloonDiv - div to add to DOM in balloon
  // Create Placemark

  console.log(opts);

  var placemark = instance.createPlacemark('');
  instance.getFeatures().appendChild(placemark);

  if(opts.iconHref) {
    // Define a custom icon.
    var icon = instance.createIcon('');
    icon.setHref(opts.iconHref);
    var style = instance.createStyle('');
    style.getIconStyle().setIcon(icon);
    style.getIconStyle().setScale(2.0);

    placemark.setStyleSelector(style);
  }

  // Set the placemark's location.
  var point = instance.createPoint('');
  point.setLatitude(opts.lat);
  point.setLongitude(opts.lng);
  placemark.setGeometry(point);

  // Add the placemark to Earth.
  instance.getFeatures().appendChild(placemark);

  if(opts.flyTo === true) {
    // Look at the Point
    var la = instance.getView().copyAsLookAt(instance.ALTITUDE_RELATIVE_TO_GROUND);
    la.setLatitude(opts.lat);
    la.setLongitude(opts.lng);

    // zoom speed and range
    instance.getOptions().setFlyToSpeed(1);
    la.setRange(1000000.0);
    instance.getView().setAbstractView(la);
  }

  if(opts.balloonDiv) {
    // Create Balloon
    var b = instance.createHtmlDivBalloon('');
    b.setFeature(placemark);
    b.setCloseButtonEnabled(false);
    b.setContentDiv(opts.balloonDiv);
    instance.setBalloon(b);
  }
}

$(window).load(function () {
  google.earth.createInstance('map3d', function (instance) {
    // Success Callback
    geWidget = instance;
    geWidget.getWindow().setVisibility(true);

    // Turn on layers
    geWidget.getLayerRoot().enableLayerById(geWidget.LAYER_BORDERS, true);

    // Set G2 HQ as first point.
    geNewPoint(geWidget, {
      lat: 39.125,
      lng: -76.788,
      iconHref: 'http://g2-inc.com/sites/all/themes/g2website/images/g2logo.png',
      flyTo: true
    });

  }, function (error) {
    // Failure Callback
  });
});