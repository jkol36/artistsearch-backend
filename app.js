import agent from 'superagent'
import cheerio from 'cheerio'
import {
	queryForArtistOnNextBigSound, 
	getNextBigSoundArtistDetails,
	authWithPollstar,
	pollstarHome,
	getUrl,
	fetchTwitterInfo, 
	getPageDetails,
	getSimilarArtists,
	searchPollstar,
	getPollstarArtistUrl,
	queryPollstarArtistUrl,
	parseArtistsPollstarPage,
	authWithNextBigSound
} from './helpers'
import {
	artistRef,
	similarArtistRef,
	topCitiesRef,
	topCountriesRef,
	urlHandlesRef,
	scoresRef,
	firebase
} from './config'
require('./config')
let Promise = require('bluebird')

function startPromiseChain(q) {
	let name = q.split(' ').join('-')
	let headerObj
	let accessToken
	authWithNextBigSound(process.env.NEXT_BIG_SOUND_EMAIL, process.env.NEXT_BIG_SOUND_PASSWORD)
	.then(t => (accessToken = t))
	.then(() => queryForArtistOnNextBigSound(q, accessToken))
	.then((artist)=> {
		console.log('got artist', artist)
		scoresRef.child(name).remove()
		scoresRef.child(name).set(artist.scores)
		//artistRef.child(name).child('artist_endpoints').set(artist.artist_endpoints)
		let urls = [
			{endpoint:'url_handles', url:`https://api.nextbigsound.com/meta/v1/artists/${artist.id}?access_token=${accessToken}&fields=artist_endpoints`},
			{endpoint:'top-countries', url:`https://api.nextbigsound.com/metrics/v1/entity/${artist.id}/top/country?access_token=${accessToken}`},
			{endpoint: 'top-cities', url:`https://api.nextbigsound.com/metrics/v1/entity/${artist.id}/top/zip3?access_token=${accessToken}`},
			{endpoint: 'awareness', url:`https://api.nextbigsound.com/metrics/v1/entity/${artist.id}/category/awareness?access_token=${accessToken}`},
			{endpoint: 'engagement', url:`https://api.nextbigsound.com/metrics/v1/entity/${artist.id}/category/engagement?access_token=${accessToken}`},
			{endpoint: 'demographics', url:`https://api.nextbigsound.com/metrics/v1/entity/${artist.id}/demographics?access_token=${accessToken}`}
		]
		return Promise.all(Promise.map(urls, (url)=> {
			return getNextBigSoundArtistDetails(url.url, url.endpoint)
			}))
	})
	.then((res)=> res)
	.then((details)=> {
		return Promise.all(Promise.map(details, (detail)=> {
			let endpoint = detail.endpointName
			let data
			if(detail.data) {
				data = detail.data
			}
			else {
				data = detail
			}
			if(endpoint === 'url_handles') {
				let facebookUrl = data.artist_endpoints.items.filter((item)=> {
					if(item.endpoint.url.includes('facebook')) {
						let baseUrl = 'https://www.facebook.com/' 
						let returnUrl = baseUrl+item.endpoint.url_alias+'/likes'
						console.log(returnUrl)
						return returnUrl
					}
				})[0].endpoint.url+'/likes'
				let twitterUsername = data.artist_endpoints.items.filter((item)=> {
					if(item.endpoint.url.includes('twitter.com')) {
						return item.endpoint.url
					}
				})[0].endpoint.url.split('/')[3]
				artistRef.child(name).child('twitterUsername').set(twitterUsername)
				artistRef.child(name).child('facebookUrl').set(facebookUrl)
				return fetchTwitterInfo(twitterUsername)
				.then((info)=> {
					return artistRef.child(name).update(info)
				})
			}
			else {
				return getSimilarArtists(q.query)
				.then((similarArtists)=> {
					return Promise.all(Promise.map(similarArtists, (artist)=> {
						return similarArtistRef.child(name).push(artist.similarArtist)
					}))
				})
				.then(() => {
					firebase.database().ref(endpoint.split('/').join('-')).child(name).remove()
					return firebase.database().ref(endpoint.split('/').join('-')).child(name).set(data)
				})
			}

		}))
	}).then((done)=> {
		console.log('finished')
		//return firebase.database().ref('work-to-do/nextbigsound').child(q.key).remove()

	})
	
	
}

function pollstarPromiseChain(q) {
	let artist = q
	let headerObj
	return new Promise((resolve, reject)=> {
		authWithPollstar('drexel', 'dragons')
		.then((headers)=> {
			headerObj = headers
			return searchPollstar(headers, artist)
		})
		.then((results)=> getPollstarArtistUrl(results, artist))
		.then((url)=> queryPollstarArtistUrl(url, headerObj))
		.then((html)=> parseArtistsPollstarPage(html))
		.then((data)=> {
			firebase.database().ref('pollstarData').child(artist.split(' ').join('-')).remove()
			firebase.database().ref('pollstarData').child(artist.split(' ').join('-')).set(data)
		})
		.catch((err)=> console.log(err))
	})
}


function start() {
	console.log('listening for a query')
	firebase.database().ref('queries').remove()
	firebase.database().ref('queries').on('child_added', snap => {
		console.log('looking up artist details on next big sound for', snap.val())
		startPromiseChain(snap.val())
		pollstarPromiseChain(snap.val())
	})
}
start()
