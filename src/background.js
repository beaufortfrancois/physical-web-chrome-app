var lastTimestamp;

function getMetadata(urls, callback) {
  var objects = [];
  for (var url of urls) {
    objects.push({
      url: url,
      txpower: 0,
      rssi: 0,
    });
  }
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://url-caster.appspot.com/resolve-scan');
  xhr.responseType = 'json';
  xhr.onloadend = function() { callback(xhr.response); };
  xhr.send(JSON.stringify({'objects' : objects}));
}

function onHttpServiceListUpdated(services) {
  console.log('onHttpServiceListUpdated', services);

  if (services.length === 0) {
    chrome.notifications.clear('beacons');
    return;
  }

  lastTimestamp = new Date();

  var beaconUrls = [];
  for (var service of services) {
    beaconUrls.push('http://' + service.serviceHostPort.replace(':80', '') +
                    service.serviceData[0].substr('path='.length));
  }
  showBeaconNotification(beaconUrls, lastTimestamp);
}

function showBeaconNotification(beaconUrls, timestamp) {
  console.log('showBeaconNotification', beaconUrls);

  var numBeacons = beaconUrls.length;
  var options = {
    type: 'list',
    title: numBeacons + ' Beacon' + (numBeacons > 1 ? 's' : '') + ' Nearby',
    message: '',
    iconUrl: 'assets/icon' + (devicePixelRatio === 2 ? 160 : 80) + '.png',
    items: [],
    isClickable: false,
    priority: -2,
  };

  getMetadata(beaconUrls, function(response) {
    if (!response.metadata || response.metadata.length === 0) {
      for (var beaconUrl of beaconUrls) {
        options.items.push({
          title: beaconUrl,
          message: '',
        });
      }
    } else {
      for (var metadata of response.metadata) {
        options.items.push({
          title: metadata.title,
          message: metadata.url
        });
      }
    }
    if (timestamp === lastTimestamp) {
      chrome.notifications.create('beacons', options);
    }
  });
}

var httpFilter = { serviceType: '_http._tcp.local' };
chrome.mdns.onServiceList.removeListener(onHttpServiceListUpdated, httpFilter);
chrome.mdns.onServiceList.addListener(onHttpServiceListUpdated, httpFilter);
