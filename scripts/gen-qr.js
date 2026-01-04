const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const url = 'http://192.168.1.229:3000';
const outputPath = path.join(__dirname, '../public/mobile-qr.png');

QRCode.toFile(outputPath, url, {
    color: {
        dark: '#000000',
        light: '#FFFFFF'
    },
    width: 400
}, function (err) {
    if (err) throw err;
    console.log('QR code saved to ' + outputPath);
});
