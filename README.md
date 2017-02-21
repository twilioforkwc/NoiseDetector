# NoiseDetector

A barebones Node.js app using [Express 4](http://expressjs.com/).

## Quick Start on your server.

Make sure you have [Node.js](http://nodejs.org/) installed.

### STEP 1. Clone source from GitHub.
```sh
$ git clone git@github.com:twilioforkwc/NoiseDetector.git # or clone your own fork
$ cd NoiseDetector
$ npm install
```

### STEP 2. Make config/default.json.
1. copy config/default.sample to config/default.json
2. hostname（ Edit your server url. ex. https://www.hoge.com ）
3. twilio.server（ Edit your server name. ex. www.hoge.com ）
4. twilio.SID（ Edit your Twilio SID. ）
5. twilio.Token（ Edit your Twilio Token. ）
6. twilio.From（ Edit your Twilio number for calling. ex.+815012345678 ）

### STEP 3. Get start.

```sh
$ npm start
```

Your app should now be running on [localhost:4444](http://localhost:4444/).

### STEP 4. Access via your browser.

Access url is http://www.hoge.com/ (Replace your server name.)
