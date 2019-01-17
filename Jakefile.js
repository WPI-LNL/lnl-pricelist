const fs = require('fs');
const path = require('path');

const jake = require('jake');
const nunjucks = require('nunjucks');
const sass = require('sass');
const puppeteer = require('puppeteer');
const merge = require('easy-pdf-merge');

const version = require('./package.json').version;
const gitRev = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
const versionInfoStr = `DRAFT ${version} ${gitRev}`

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
jake.file('pricelist.pdf', ['page1.pdf', 'page2.pdf', 'page3.pdf'], function() {
	merge(['page1.pdf', 'page2.pdf', 'page3.pdf'], 'pricelist.pdf', function(err) {
		if (err) {
			throw err;
		}
		console.log('Merged the PDFs')
		jake.complete();
	})
}, {async: true})
jake.file('page1.pdf', ['page1.html', 'styles.css'], function() {
	makePdf('page1.html', 'page1.pdf');
}, {async: true});
jake.file('page2.pdf', ['page2.html', 'styles.css'], function() {
	makePdf('page2.html', 'page2.pdf');
}, {async: true});
jake.file('page3.pdf', ['page3.html', 'styles.css'], function() {
	makePdf('page3.html', 'page3.pdf');
}, {async: true});
jake.file('page1.html', ['src/page1.html', 'package.json'], function() {
	renderNunjucks('src/page1.html', 'page1.html');
});
jake.file('page2.html', ['src/page2.html', 'package.json'], function() {
	renderNunjucks('src/page2.html', 'page2.html');
});
jake.file('page3.html', ['src/page3.html', 'package.json'], function() {
	renderNunjucks('src/page3.html', 'page3.html');
});
jake.file('styles.css', ['src/styles.scss'], function() {
	renderSass('src/styles.scss', 'styles.css');
});

jake.task('clean', [], function() {
	deleteFileIfExists('pricelist.pdf');
	deleteFileIfExists('page1.pdf');
	deleteFileIfExists('page2.pdf');
	deleteFileIfExists('page3.pdf');
	deleteFileIfExists('page1.html');
	deleteFileIfExists('page2.html');
	deleteFileIfExists('page3.html');
	deleteFileIfExists('styles.css');
})
