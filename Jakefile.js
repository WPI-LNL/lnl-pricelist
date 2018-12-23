const fs = require('fs');
const path = require('path');

const jake = require('jake');
const nunjucks = require('nunjucks');
const sass = require('sass');
const puppeteer = require('puppeteer');
const merge = require('easy-pdf-merge');

const version = require('./package.json').version;
const versionInfoStr = `DRAFT ${version}`

function renderSass(input_file, output_file) {
	const css = sass.renderSync({file: input_file}).css;
	fs.writeFileSync(output_file, css);
	console.log(`Rendered ${input_file} to ${output_file}`);
	return output_file;
}

function renderNunjucks(input_file, output_file) {
	const html = nunjucks.render(input_file, {versionInfo: versionInfoStr});
	fs.writeFileSync(output_file, html);
	console.log(`Rendered ${input_file} to ${output_file}`);
	return output_file;
}

async function makePdf(input_file, output_file) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto('file:' + path.resolve(input_file));
	await page.pdf({path: output_file, printBackground: true});
	console.log(`Rendered ${input_file} to ${output_file}`);
	jake.complete();
	browser.close();
}

function deleteFileIfExists(file) {
	try {
		fs.unlinkSync(file);
	} catch (err) {
		if (err.code !== 'ENOENT') {
			throw err;
		}
	}
}

jake.task('default', ['pricelist.pdf']);
jake.file('pricelist.pdf', ['front.pdf', 'back.pdf'], function() {
	merge(['front.pdf', 'back.pdf'], 'pricelist.pdf', function(err) {
		if (err) {
			throw err;
		}
		console.log('Merged the PDFs')
		jake.complete();
	})
}, {async: true})
jake.file('front.pdf', ['front.html', 'styles.css'], function() {
	makePdf('front.html', 'front.pdf');
}, {async: true});
jake.file('back.pdf', ['back.html', 'styles.css'], function() {
	makePdf('back.html', 'back.pdf');
}, {async: true});
jake.file('front.html', ['src/front.html', 'package.json'], function() {
	renderNunjucks('src/front.html', 'front.html');
});
jake.file('back.html', ['src/back.html', 'package.json'], function() {
	renderNunjucks('src/back.html', 'back.html');
});
jake.file('styles.css', ['src/styles.scss'], function() {
	renderSass('src/styles.scss', 'styles.css');
});

jake.task('clean', [], function() {
	deleteFileIfExists('pricelist.pdf');
	deleteFileIfExists('front.pdf');
	deleteFileIfExists('back.pdf');
	deleteFileIfExists('front.html');
	deleteFileIfExists('back.html');
	deleteFileIfExists('styles.css');
})
