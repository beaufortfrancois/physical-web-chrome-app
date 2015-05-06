var lastTimestamp;

function getMetadata(urls, callback) {
  var objects = urls.map(function(url) { return {'url': url}; });
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://url-caster.appspot.com/resolve-scan');
  xhr.responseType = 'json';
  xhr.onloadend = function() {
    callback((xhr.response && xhr.response.metadata) || []);
  };
  xhr.send(JSON.stringify({'objects' : objects}));
}

function onHttpServiceListUpdated(services) {
  console.log('onHttpServiceListUpdated', services);

  if (services.length === 0) {
    chrome.notifications.clear('beacons');
    return;
  }

  lastTimestamp = new Date();

  var beaconUrls = services.map(function(service) {
    return 'http://' + service.serviceHostPort.replace(':80', '') +
        service.serviceData[0].substr('path='.length);
  });
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

  getMetadata(beaconUrls, function(metadata) {
    if (timestamp !== lastTimestamp) {
      return;
    }

    for (var beaconUrl of beaconUrls) {
      var urlMetadata = metadata.filter(function(data) {
        return data.id === beaconUrl;
      }).shift();
      options.items.push({
        title: (urlMetadata && urlMetadata.title) || beaconUrl,
        message: (urlMetadata && urlMetadata.url) || ''
      });
    }
    chrome.notifications.create('beacons', options, function() {
      window.close();
    });
  });
}

function searchBeacons() {
  console.debug('searchBeacons');

  var httpFilter = { serviceType: '_http._tcp.local' };
  chrome.mdns.onServiceList.removeListener(onHttpServiceListUpdated, httpFilter);
  chrome.mdns.onServiceList.addListener(onHttpServiceListUpdated, httpFilter);
}

searchBeacons();
chrome.notifications.onClosed.addListener(searchBeacons);
