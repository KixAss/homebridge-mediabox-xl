# homebridge-mediabox-xl

`homebridge-mediabox-xl` is a Homebridge plugin allowing you to control your mediabox with the Apple Home app & Control Centre remote!

The Mediabox XL will display as a TV Accessory with Power & Input Control.

## Requirements
* iOS 12.2 (or later)
* [Homebridge](https://homebridge.io/) v0.4.46 (or later)

## Installation
Install homebridge-mediabox-xl:
```sh
npm install -g homebridge-mediabox-xl
```

## Usage Notes
Quickly switch input using the information (i) button in the Control Centre remote

## Configuration
Add a new platform to your homebridge `config.json`.

Example configuration:

```js
{
    "platforms": [
      {
        "platform": "mediabox-xl",
        "name": "Mediabox",
        "ip": "123.123.123.123"
      }
    ]
  }
```

## Thanks to
