import config from 'config';
import EventEmitter from 'eventemitter3';
import db from 'montydb';
import fb from './util/facebook';
import cacher from 'sequelize-redis-cache';

class User extends EventEmitter {
  constructor() {
    super();
  }

  findOrCreate(uid){
    return new Promise((resolve, reject) => {
      let cacheObj = cacher(db.sequelize, global.redisCache )
        .model('User')
        .ttl(config.get('CACHE_TIME'));
      cacheObj.findOne({
        where: {
          uid,
        },
      })
      .then((user) => {
        console.log('FINDORCREATE: user cached?', cacheObj.cacheHit, user, uid);
        if (!user && cacheObj.cacheHit === false) {
          console.log('FINDORCREATE: ->FB');
          return fb.getUserData({
            uid,
          });
        } else {
          console.log('FINDORCREATE: ->skip FB, already got it');
          resolve(user);
        }
      })
      .then((fbUser)=>{
        console.log('FINDORCREATE: ->if we have a user from FB lets add to DB.');
        if (fbUser) {
          let {first_name, last_name, profile_pic, locale, timezone, gender} = fbUser;
          return db.User.create({
            uid,
            first_name,
            last_name,
            profile_pic,
            locale,
            timezone,
            gender,
          });
        }
      })
      .then((user) =>{
        console.log('FINDORCREATE: ->last resolve.');
        resolve(user);
      })
      .catch((err)=>{
        console.log('FINDORCREATE: errror', err)
        reject(err);
      });
    });
  }
}

module.exports = new User();
