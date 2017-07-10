require('./config')
import { expect } from 'chai'
import { artistRef } from './config'
import { 
  fetchTwitterInfo,
  queryForArtistOnNextBigSound,
  getNextBigSoundArtistDetails,
  getPageDetails,
  authWithNextBigSound } from './helpers'


describe('socialmedia stats for artist', () => {
  it('should find social media stats for LilTunechi', done => {
    console.log(process.env.ACCESS_TOKEN)
    fetchTwitterInfo('liltunechi')
    .then(info => {
      expect(info).to.not.be.undefined
      console.log(info)
      done()
    })
  })
})

describe('next big sound', () => {
  let token
  let artist
  let facebookUrl
  it('should authenticate with next big sound', done => {
    authWithNextBigSound(process.env.NEXT_BIG_SOUND_EMAIL, process.env.NEXT_BIG_SOUND_PASSWORD)
    .then(t => {
      expect(t).to.not.be.undefined
      token = t
      done()
    })
  })
  it('should get artist id and scores', done => {
    queryForArtistOnNextBigSound('lil wayne', token)
    .then(res => {
      expect(res).to.not.be.undefined
      artist = res
      done()
    })
  })
  it('should get url handles, top countries, and top cities for artist', done => {
    let urls = [
      {endpoint:'url_handles', url:`https://api.nextbigsound.com/meta/v1/artists/${artist.id}?access_token=${token}&fields=artist_endpoints`},
      {endpoint:'top-countries', url:`https://api.nextbigsound.com/metrics/v1/entity/${artist.id}/top/country?access_token=${token}`},
      {endpoint: 'top-cities', url:`https://api.nextbigsound.com/metrics/v1/entity/${artist.id}/top/zip3?access_token=${token}`}
    ]
    Promise.all(Promise.map(urls, (url)=> {
      return getNextBigSoundArtistDetails(url.url, url.endpoint)
      }))
    .map(detail => {
      expect(detail).to.not.be.undefined
      let {endpointName, data} = detail
      if(!data) {
        data = detail
      }
      if(endpointName === 'url_handles') {
        facebookUrl = detail.artist_endpoints.items.filter((item)=> {
          if(item.endpoint.url.includes('facebook')) {
            return item.endpoint.url
          }
        })[0].endpoint.url+'/likes'
        let twitterUsername = detail.artist_endpoints.items.filter((item)=> {
          if(item.endpoint.url.includes('twitter.com')) {
            return item.endpoint.url
          }
        })[0].endpoint.url.split('/')[3]
        expect(facebookUrl).to.not.be.undefined
        expect(twitterUsername).to.not.be.undefined
      }
      return artistRef.child('lil-wayne').child(endpointName.split('/').join('-')).update(data)
      
    })
    .then(res => {
      done()
    })
  })
})