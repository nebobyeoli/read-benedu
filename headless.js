const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

function rmChromeData(maxRetries, retryDelay, timeout, exitonCompletion) {
    console.log('removing chromeData temp folder...');

    fs.rmdir('chromeData', {
        recursive: true,
        maxRetries: maxRetries,
        retryDelay: retryDelay

    }, err => {
        if (err) console.error(err);
        else     console.log('removed chromeData temp folder');
        if (exitonCompletion) process.exit();
    });

    setTimeout(() => { console.log('remove failed'); process.exit(); }, timeout);
}

function aSleep(milliseconds) {
    return new Promise(res => setTimeout(res, milliseconds)); // res = resolve
}

function wait(command, timeout) {
    return Promise.all([ command, aSleep(timeout) ]);
}

async function rmValue(page, selector) {
    await page.click(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
}

async function screenshot(page, imgname='benedu') {
    console.log('screenshot...');
    await page.screenshot({ path: `./${imgname}.png`, fullPage: false});
    console.log('screenshot');
}

const query = { // Object for fetching selector values

    loginDiv: 'div form div.login-buttons',

    loginEmail: '#loginID',
    loginPd: '#loginPW',
    loginBtn: 'div form div.login-buttons > button:nth-child(1)',

    subj: '#Subject-select',
    subjEng: 'eAw5Wkv6E92IkZ3O2gUo3w{e}{e}',
    prevSwitch: 'div.main-content div.page-content div.form-group > div:nth-child(2) li > div:nth-child(1) > label',
    td10th: '#TaskList-table > tbody > tr:nth-child(10)',
    chrowMax: '#TaskList-table_length > label > select',

    problemtr: '#TaskList-table > tbody > tr'
};

// npm run head

exports.run = async function () {

    const browser = await puppeteer.launch({
        ignoreDefaultArgs: true,
        headless: true,
        devtools: false,
        defaultViewport: { width: 1280, height: 882 },
        args: [
            '--incognito',
            '--headless',
            '--no-sandbox',
            '--disable-gpu',
            '--user-data-dir=./chromeData/temp',
            'https://benedu.co.kr/',
            '--mute-audio',
            '--no-first-run',
            '--disable-gl-drawing-for-tests',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-zygote'
        ]
    });

    // const browser = await puppeteer.launch({ headless: false, args: ['https://benedu.co.kr/'] });

    const [page] = await browser.pages();
    console.log('connected');

    try
    {
        await enableStealth(page);
        console.log('enabled stealth');

        await page.waitForSelector(query.loginDiv);
        await page.keyboard.press('Tab');

        if (await page.$eval(query.loginEmail, el => el.value)) await rmValue(page, query.loginEmail);
        await wait(page.type(query.loginEmail, process.env.mymail), 300);
        await wait(page.type(query.loginPd,    process.env.mypd),   300);
        await page.click(query.loginBtn);

        // From https://stackoverflow.com/a/58451235
        // -- NO [await] keyword
        // page.waitForRequest(req => req.url().includes('StudentHome') && req.method() == 'GET');

        for (; !page.url().includes('StudentHome'); await aSleep(400));
        console.log('logged in');

        await wait(page.goto('https://benedu.co.kr/StudentStudy/TaskList', { waitUntil: 'domcontentloaded' }), 600),
        console.log('goto /StudentStudy/TaskList');

        // 시험 과목 -> '영어'
        await wait(page.select(query.subj, query.subjEng), 600);

        // 지난 학습 보기
        await wait(page.click(query.prevSwitch), 600);
        for (; await page.$(query.td10th) == null; await aSleep(400)); // 목록 load 대기

        // 항목 표시 -> '100'
        await wait(page.select(query.chrowMax, '100'), 600);
        console.log('switched subj prev');

        const probList = await page.$$(query.problemtr);
        console.log('stored days:', probList.length);
        
        // 주소 id 목록 (tr) 저장 -- 일별 2문제마다
        const values = [];

        // From https://stackoverflow.com/a/56467778
        for (const tr of probList) {
            const value = await page.evaluate(el => el.getAttribute('value'), tr);
            values.push(value);
        }
        console.log('pushed problem link ids');

        const questions = [];
        const answers   = [];
        const explains  = [];

        let i = 1;

        for (const value of values.reverse()) {

            const link = `https://benedu.co.kr/StudentStudy/Commentary?id=${value.slice(0,-6)}%7Be%7D%7Be%7D&value=ymWuGYYSOfmJLRPkt3xlfw%7Be%7D%7Be%7D&type=0`;
            await page.goto(link, { waitUntil: 'networkidle2' });

            let question = `${i++}. `;
            // let answer = '';

            let childCount = await page.$eval('#QUESTION_1 > div:nth-child(2)', el => el.childElementCount);

            for (let i = 1; i <= childCount; i++) {
                const obj = await page.$eval(`#QUESTION_1 > div:nth-child(2) > :nth-child(${i})`, c => {
                    return { tagName: c.tagName, innerHTML: c.innerHTML, textContent: c.textContent };
                }); // elem-child

                if (obj.tagName == 'TABLE') console.log(obj);
            }

            console.log('=========================================');
            
            await page.screenshot({ path: './benedu.png', fullPage: true });
        };

        // await page.click(query.title);

        // await replaceTxtValue(page, title);
        // await page.keyboard.press('Tab');
        // await replaceTxtValue(page, desc);
        // await page.keyboard.press('Tab');

        // // add terms
        // // *login doesn't use getFocusedValue check: working use of page.type than page.keyboard.type
        // for (let i = 0; i < terms.length; i++) {
        //     await addTerm(page, terms[i], defs[i]);
        //     if (await getFocusedName(page) == '+ Add card') await page.keyboard.press('Enter');
        // }

        // console.log('words added');

        // await page.click(query.createSet);

        // console.log('saving...');
        // await page.waitForSelector(query.urlbox);

        // console.log('created set');
        // let url = page.url().slice(0, -5);
        // console.log('-'.repeat(url.length));
        // console.log('Link to created set:');
        // console.log(url);
        // console.log('-'.repeat(url.length));

        // await page.click(query.toCorF);
        // await page.click(query.selectToFolder);
        // await page.click(query.addtoFolder);

        // await page.keyboard.press('Escape');
        // await aSleep(1000); // wait for modal extinguish

        // console.log('added set to folder 워드마스터');

        // await logout(page);
        
        // // finish
        
        // await browser.close();
        // console.log('closed browser');
        // rmChromeData(5, 800, 15000, true);
    }
    
    catch (err) {
        console.error(err);
        await screenshot(page, 'errshot');
        await browser.close();
        rmChromeData(5, 800, 15000, true);
    }
}

exports.run();

async function enableStealth(page) {
// From https://intoli.com/blog/not-possible-to-block-chrome-headless/
// In   https://stackoverflow.com/questions/50663992/puppeteer-queryselector-returns-null/50710920

    // Pass the User-Agent Test.
    // const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
    const userAgent = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0';
    await page.setUserAgent(userAgent);

    // Pass the Webdriver Test.
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Pass the Chrome Test.
    await page.evaluateOnNewDocument(() => {
        window.navigator.chrome = { runtime: {} };
    });

    // Pass the Permissions Test.
    await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query;
        return window.navigator.permissions.query = (parameters) => {
            parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters);
        };
    });

    // Pass the Plugins Length Test.
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    // Pass the Languages Test.
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
}
