'use strict';

let Jimp = require('jimp')
    ,fs = require('fs')
    ,path = require('path')
    ,_ = require('lodash')
    ,Promise = require('bluebird')
    ,fileType = require('file-type');

module.exports = {
    convertImgs(files){
        let promises = [];
if(files.length) {

        _.forEach(files, (file)=>{
//console.log(file);
            //Create a new promise for each image processing
            let promise = new Promise((resolve, reject)=>{

            //Resolve image file type
            let type = fileType(file.data);

            //Create a jimp instance for this image
            new Jimp(file.data, (err, image)=>{

                //Resize this image
                image.resize(512, 512)
                //image.scaleToFit()
                    //lower the quality by 90%
                    .quality(10)
                    .getBuffer(type.mime, (err, buffer)=>{
                        //Transfer image file buffer to base64 string
                        let base64Image = buffer.toString('base64');
                        let imgSrcString = "data:" + type.mime + ';base64, ' + base64Image;
                        //Resolve base94 string
                        resolve(imgSrcString);
                    });
                })
            });

            promises.push(promise);
        });

        //Return promise array
        return Promise.all(promises);
    }
    else {
          let promise = new Promise((resolve, reject)=>{

          //Resolve image file type
          let type = fileType(files.data);

          //Create a jimp instance for this image
          new Jimp(files.data, (err, image)=>{

              //Resize this image
              image.resize(512, 512)
                  //lower the quality by 90%
                  .quality(10)
                  .getBuffer(type.mime, (err, buffer)=>{
                      //Transfer image file buffer to base64 string
                      let base64Image = buffer.toString('base64');
                      let imgSrcString = "data:" + type.mime + ';base64, ' + base64Image;
                      //Resolve base94 string
                      resolve(imgSrcString);
                  });
              })
          });

          promises.push(promise);

      //Return promise array
      return Promise.all(promises);
      console.log(files.data);
    }
  }
};
