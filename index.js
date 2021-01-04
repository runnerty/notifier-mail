'use strict';

const Notifier = require('@runnerty/module-core').Notifier;
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class mailNotifier extends Notifier {
  constructor(notification) {
    super(notification);
  }

  send(notification) {
    let endOptions = {};
    notification.to = notification.to ? notification.to.toString() : '';
    notification.cc = notification.cc ? notification.cc.toString() : '';
    notification.bcc = notification.bcc ? notification.bcc.toString() : '';

    let transport = nodemailer.createTransport(notification.transport);
    let filesReads = [];

    let templateDir = path.resolve(notification.templateDir, notification.template);
    let htmlTemplate = path.resolve(templateDir, 'html.html');
    let txtTemplate = path.resolve(templateDir, 'text.txt');

    filesReads.push(this.readFilePromise('html', htmlTemplate));
    filesReads.push(this.readFilePromise('text', txtTemplate));

    try {
      Promise.all(filesReads).then(res => {
        let html_data;
        let text_data;

        if (res[0].hasOwnProperty('html')) {
          [html_data, text_data] = [res[0].html.toString(), res[1].text.toString()];
        } else {
          [html_data, text_data] = [res[1].html.toString(), res[0].text.toString()];
        }

        let textData = [];
        textData.push(this.recursiveObjectInterpreter(html_data, notification));
        textData.push(this.recursiveObjectInterpreter(text_data, notification));

        Promise.all(textData).then(res => {
          let [html, text] = res;
          let mailOptions = {
            from: notification.from,
            to: notification.to,
            cc: notification.cc,
            bcc: notification.bcc,
            subject: notification.subject,
            text: text,
            html: html,
            attachments: notification.attachments
          };

          if (notification.disable) {
            this.logger('warn', 'Mail sender is disable.');
            endOptions.messageLog = 'Mail sender is disable.';
            this.end(endOptions);
          } else {
            transport.sendMail(mailOptions, err => {
              if (err) {
                endOptions.messageLog = 'Mail sender:' + JSON.stringify(err);
                this.end(endOptions);
              } else {
                this.end();
              }
            });
          }
        });
      });
    } catch (err) {
      endOptions.end = 'error';
      endOptions.messageLog = 'Mail sender:' + JSON.stringify(err);
      this.end(endOptions);
    }
  }

  readFilePromise(type, file) {
    return new Promise((resolve, reject) => {
      fs.readFile(file, (err, data) => {
        let res = {};
        if (err) {
          res[type] = err;
          reject(res);
        } else {
          res[type] = data;
          resolve(res);
        }
      });
    });
  }
}

module.exports = mailNotifier;
