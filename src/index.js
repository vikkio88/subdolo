#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const inquirer = require('inquirer');
const BASE_URL = 'https://yts-subs.com';
const api = axios.create({baseURL: `${BASE_URL}`});
const LANGUAGES = ['English', 'Italian'];

const format = {
	movie(data, index){
		const {
			mov_id,
			mov_imdb_code,
			mov_title,
			mov_slug,
			mov_year,
		} = data;
		return {
			id: mov_id,
			imdbId: mov_imdb_code,
			slug: mov_slug,
			title: mov_title,
			year: mov_year,
			value:index, // used by inquirer
			name:`${mov_title} (${mov_year})`, // used by inquirer
		};
	},
	sub(data, index){
		const {rate, lang, release, uploader} = data;
		return {name: `${lang} - ${release} (rate: ${rate} | ${uploader})`, value: index};
	}
};

async function serch(term) {
	let body = null;
	try {
		const {data} = await api.get(`search/ajax/${term}`);
		body = data;
	}catch (error) {
		console.error(error);
	}

	return body;
}

async function getSubsForMovie(imdbId, filterLanguages = LANGUAGES) {
	let results = [];
	try {
		const {data} = await api.get(`movie-imdb/${imdbId}`);
		const $ = cheerio.load(data);
		$('table tbody tr').map((i, element) =>{
			const  lang = $(element).find('td:nth-of-type(2)').text().trim();
			if (!filterLanguages.includes(lang)){
				return;
			}
			const rate = $(element).find('td:nth-of-type(1)').text().trim();
			const release = $(element).find('td:nth-of-type(3)').text().trim();
			const uploader = $(element).find('td:nth-of-type(4)').text().trim();
			const info = $(element).find('td:nth-of-type(5) a').attr('href');
			const downloadUrl = `https://yifysubtitles.org/subtitle/${info.replace(/\/subtitles\//,'')}.zip`;
			results.push({rate, lang, release, uploader, downloadUrl});
		});
	}catch (error) {
		console.error(error);
	}

	return results;

}

function printResult(movie, sub){
	const {lang, release, downloadUrl} = sub;
	console.log('------------');
	console.log('Result:');
	console.log();
	console.log(`${movie.name}`);
	console.log('sub:');
	console.log(`${lang} - ${release}`);
	console.log('download url:');
	console.log(`\t${downloadUrl}`);
}

async function main() {
	const {title}
     = await inquirer
     	.prompt([
     		{type: 'input', name: 'title', message: 'movie title:'},
     	]);

	const movies = await serch(title);
	if (!Array.isArray(movies) || movies.length < 1){
		console.log(`No movies found with title ${title}`);
		process.exit(0);
	}
    
	let choices = movies.map(format.movie);
	const {movieIndex} = await inquirer.prompt({type:'list', name:'movieIndex', message: 'Which movie:', choices});
	const movie = choices[movieIndex];
	const {languages} = await inquirer.prompt({type:'checkbox', name:'languages', message: 'Which movie:', choices: LANGUAGES.map(name => ({name, value: name, checked: true}))});
	const subs = await getSubsForMovie(movie.imdbId, languages);
	if (!Array.isArray(subs) || subs.length < 1){
		console.log(`No subs found for movie title ${movie.name}`);
		process.exit(0);
	}
	choices = subs.map(format.sub);
	const {subIndex} = await inquirer.prompt({type:'list', name:'subIndex', message: 'Select Subtitle to download:', choices});
	const selectedSub = subs[subIndex];

	printResult(movie, selectedSub);
	process.exit(0);
}

main();
