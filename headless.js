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

// npm run head

const query = { // Object for fetching selector values

    loginDiv: 'div form div.login-buttons',

    loginEmail: '#loginID',
    loginPd: '#loginPW',
    loginBtn: 'div form div.login-buttons > button:nth-child(1)',

    userInfo: '#navbar-container ul > li.light-blue.dropdown-modal > a > span',

    // openLogin: 'div.UIModalBody > form > div.SignupWithEmailForm-belowForm > div.UIDiv.SignupWithEmailForm-alreadyHaveAccount > span > span > button',
    // loginbtn: 'div.UIModalBody > form > button',
    // reSignin: 'span.SiteHeader-signInBtn',

    // id: '#username',
    // pwd: '#password',

    // rmAutosaved: 'div > div.UINotification-content > div.UINotification-actions > div > button',

    // title: '#SetPageTarget > div > div.CreateSetHeader > div:nth-child(2) > div > div.CreateSetHeader-textarea.CreateSetHeader-title > div > label > div > div > div.AutoExpandTextarea-wrapper > textarea',
    // desc: 'div.CreateSetHeader-textarea.CreateSetHeader-description textarea',

    // addCard: '#addRow > span > button',

    // createSet: '#SetPageTarget > div > div.CreateSetPage-container > div > div > div.CreateSetPage-footer > div > button',
    // urlbox: 'div.ShareModalOptions-textarea textarea.UITextarea-textarea', // textarea of set url (though unused)

    // toCorF: 'div.UIModalBody > div:nth-child(3) > button', // add to class or folder
    // selectToFolder: 'div.UIToggle > span:nth-child(2)',
    // createNewFolder: 'div.UIDiv.SaveSetModal-createButton button.UILinkButton',
    // addtoFolder: 'input.UISwitch-input',

    // usrhead: 'img.Image-image',
    // logout: '.SiteHeader-logoutLink button.UILink',
    // seller: 'div.UpsellModal'
};

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

        try {
            await page.waitForSelector(query.loginDiv, { timeout: 800 });
        }
        catch {
            console.log('already logged in');
            // await logout(page);
            await page.goto('https://benedu.co.kr/StudentHome', { waitUntil: 'networkidle2' });
            console.log('goto /StudentHome');
        }

        await page.type(query.loginEmail,   process.env.mymail  );
        await page.type(query.loginPd,      process.env.mypd    );

        await page.click(query.loginBtn);

        await page.waitForSelector(query.userInfo, { timeout: 10000 });
        await page.screenshot({ path: './benedu.png', fullPage: true });

        console.log('logged in');

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
