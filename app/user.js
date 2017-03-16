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
      db.User.findById(uid)
      .then((user) => {
        //console.log('fart: ', user)
        if (!user) {
          return fb.getUserData({
            uid,
          });
        } else {
          return resolve(user);
        }
      })
      .then((fbUser)=>{
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
      })
      .then((user) =>{
        resolve(user);
      })
      .catch((err)=>{
        reject(err);
      });
    });
  }
}

module.exports = new User();
