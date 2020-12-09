// Note: quizletusn and quizletpwd MUST BE REPLACED on usage

const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

function getChromePath() {
    let chromePath;
    if      (process.platform == 'win32')   chromePath = 'c:/program files (x86)/google/chrome/application/chrome.exe';
    else if (process.platform == 'linux')   chromePath = '/usr/bin/google-chrome';
    else                                    chromePath = '/library/application support/google/chrome';
    return chromePath;
}

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

// unused: default puppeteer.launch(without options)
// is a perfect headless...?
// better performance results than using the options below?
function getHeadlessOptions() {
    return {
        executablePath: getChromePath(),
        headless: true,
        ignoreDefaultArgs: true,
        devtools: false,
        dumpio: true,
        defaultViewport: { width: 1280, height: 882 },
        args: [
            '--incognito',
            '--disable-canvas-aa',
            '--disable-2d-canvas-clip-aa',
            '--disable-gl-drawing-for-tests',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--use-gl=swiftshader',
            'https://benedu.co.kr/',
            '--mute-audio',
            '--no-first-run',
            '--disable-infobars',
            '--disable-breakpad',
            '--window-size=100,100',
            '--user-data-dir=./chromeData/temp',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-translate'
        ]
    };
}

async function addTerm(page, word, def) {

    let log = '';

    await replaceTxtValue(page, word);
    log += await getFocusedValue(page) + '\t';
    await page.keyboard.press('Tab');
    
    await replaceTxtValue(page, def);
    log += await getFocusedValue(page) + '\t';
    await page.keyboard.press('Tab');

    console.log(log);
}

async function shoo(page) {
    // let shooed = 'shoo!';
    // page.$(query.seller).then(n => shooed = n);

    // await page.keyboard.press('Escape');
    // while (shooed != null) {
    //     console.log('shoo!');
    //     page.$(query.seller).then(n => shooed = n);
    //     await aSleep(500); // wait for modal extinguish
    // }
}

async function logout(page) {
    // await shoo(page);
    // await page.click(query.usrhead);
    // await page.click(query.logout);
    // console.log('pending for logout');

    // await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 });
    // console.log('logged out');
}

function aSleep(milliseconds) {
    return new Promise(r => setTimeout(r, milliseconds));
}

function getFocused(node) {
    if (node.focused) return node;
    for (const child of node.children || []) {
        const focusedNode = getFocused(child);
        if (focusedNode) return focusedNode;
    }
}

async function getFocusedName(page) {
    let focus = getFocused(await page.accessibility.snapshot());
    return focus ? focus.name : null;
}

async function getFocusedValue(page) {
    let focus = getFocused(await page.accessibility.snapshot());
    return focus ? focus.value : null;
}

async function replaceTxtValue(page, newValue) {
    if (await getFocusedValue(page)) {
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
    }
    while (await getFocusedValue(page) != newValue) await page.keyboard.type(newValue);
}

function wait(command, timeout) {
    return Promise.all([ command, aSleep(timeout) ]);
}

const query = { // Object for fetching selector values

    loginDiv: 'div form div.login-buttons',

    loginEmail: '#loginID',
    loginPd: '#loginPW',
    loginBtn: 'div form div.login-buttons > button:nth-child(1)',

    subj: '#Subject-select',
    subjEng: 'eAw5Wkv6E92IkZ3O2gUo3w{e}{e}',
    prevSwitch: 'div.main-content div.page-content div.form-group > div:nth-child(2) li > div:nth-child(1) > label',
    chrowMax: '#TaskList-table_length > label > select',

    problemtr: '#TaskList-table > tbody > tr'
};

// npm run head

exports.run = async function () {
    
    // const browser = await puppeteer.launch(getHeadlessOptions());

    // const browser = await puppeteer.launch({ args: ['https://benedu.co.kr/'] });

    const browser = await puppeteer.launch({ headless: false, args: ['https://benedu.co.kr/'] });

    const [page] = await browser.pages();

    try
    {
        await enableStealth(page);
        console.log('prepared');

        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('connected');

        try
        {
            await page.waitForSelector(query.loginDiv, { timeout: 800 });
            
            await wait(page.type(query.loginEmail, process.env.mymail), 300);
            await wait(page.type(query.loginPd,    process.env.mypd),   300);
            await page.click(query.loginBtn);

            // From https://stackoverflow.com/a/58451235
            page.waitForRequest(req => req.url().includes('StudentHome') && req.method() === 'GET');
            console.log('logged in');
        }

        catch {
            console.log('already logged in');
        }

        // await page.goto('https://benedu.co.kr/StudentStudy/TaskList', { waitUntil: 'networkidle2' });
        await page.goto('https://benedu.co.kr/StudentStudy/TaskList');
        console.log('goto /StudentStudy/TaskList');

        await page.waitForSelector(query.prevSwitch);

        await wait(page.select(query.subj, query.subjEng), 600);
        await wait(page.click (query.prevSwitch), 600);
        await wait(page.select(query.chrowMax, '100'), 200);
        console.log('switched subj prev');

        const probList = await page.$$(query.problemtr);
        console.log('stored days:', probList.length);
        
        const values = [];

        for (let tr of probList) {
            const value = await page.evaluate(el => el.getAttribute('value'), tr);
            values.push(value);
        }
        console.log('pushed problem link ids');

        values.reverse().forEach(async value => {
            await page.goto(`https://benedu.co.kr/StudentStudy/Commentary?id=${value.slice(0,-6)}%7Be%7D%7Be%7D&value=ymWuGYYSOfmJLRPkt3xlfw%7Be%7D%7Be%7D&type=3104jPV6524rCGsSRjjVsA%7Be%7D%7Be%7D`, { waitUntil: 'networkidle2' });
            //
            await page.screenshot({ path: './benedu.png', fullPage: true });
        });

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
