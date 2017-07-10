import firebaseAdmin from 'firebase-admin'
import serviceAccount from './serviceAccount.json'
global.Promise = require('bluebird')
if(process.env.NODE_ENV !== 'production') {
  require('dotenv').load()
}
export const firebase = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://ticketlynx-5a17f.firebaseio.com"

})

//ref that keeps meta data about an artist
export const artistRef = firebase.database().ref('artists')
//ref that keeps track of similar artists for an artist
export const similarArtistRef = firebase.database().ref('similar-artists')
//ref that keeps track of top cities for an artist
export const topCitiesRef = firebase.database().ref('top-cities')
//ref that keeps track of top countries for an artist
export const topCountriesRef = firebase.database().ref('top-countries')
//ref that keeps track of all urls a artist is associated with
export const urlHandlesRef = firebase.database().ref('url-handles')
//ref that keeps track of an artists engagement, reach, stage and trend
export const scoresRef = firebase.database().ref('scores')
export const queryRef = firebase.database().ref('work-to-do')