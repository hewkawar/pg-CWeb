const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');
const discord = require('discord.js');
const os = require('os');
const utilts = require('./utils');
const path = require('path');

const { db_host, db_port, db_username, db_password, webhook_url, debug_webhook_url } = require('./config.json');

const app = express();

app.use(cors());
app.use(express.json());

const hewkawar_db = mysql.createConnection({
    host: db_host,
    user: db_username,
    password: db_password,
    port: db_port,
    database: 'hewkawar_db',
});

const hstudio_db = mysql.createConnection({
    host: db_host,
    user: db_username,
    password: db_password,
    port: db_port,
    database: 'hstudio_db',
});

const m2bot_db = mysql.createConnection({
    host: db_host,
    user: db_username,
    password: db_password,
    port: db_port,
    database: 'm2bot_db',
});

const hewkawbank_db = mysql.createConnection({
    host: db_host,
    user: db_username,
    password: db_password,
    port: db_port,
    database: 'hewkawbank_db',
});

let hewkawar_db_c = false;
let hstudio_db_c = false;
let m2bot_db_c = false;
let hewkawbank_db_c = false

hewkawar_db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
        hewkawar_db_c = true;
    }
});

hstudio_db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to HStudio MySQL database');
        hstudio_db_c = true;
    }
});

m2bot_db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to M2Bot MySQL database');
        m2bot_db_c = true;
    }
});

hewkawbank_db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to HewkawBank MySQL database');
        hewkawbank_db_c = true;
    }
});

app.get('/robots.txt', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'robots.txt'));
});

app.get('/profile', async (req, res) => {
    const id = req.query.id;

    if (!id) {
        return res.status(400).json({ error: 'ID parameter is required' });
    }

    try {
        const auth_data = await utilts.getAuth(hewkawar_db, id);
        const profile_data = await utilts.getProfile(hewkawar_db, id);

        let is_admin = false;
        let is_dev = false;

        if (auth_data.permission_admin == "true") {
            is_admin = true;
        }

        if (auth_data.permission_dev == "true") {
            is_dev = true;
        }

        let profile = {
            id: profile_data.id,
            username: profile_data.username,
            displayname: profile_data.displayname,
            admin: is_admin,
            dev: is_dev,
            profile: {
                image: profile_data.profileurl
            }
        }
        return res.status(200).json(profile);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/status', (req, res) => {
    let status = {
        status: "ok"
    }
    return res.status(200).json(status);
});

app.post('/oauth2/token', (req, res) => {
    const postData = req.body;

    if (!postData.code) {
        return res.status(400).json({ status: 400, message: "No code Found!" })
    }

    hewkawar_db.query('SELECT * FROM profile_auth WHERE code = ?', [postData.code], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            return res.status(500).json({ status: 500, message: 'Internal Server Error' });
        } else {
            if (results.length === 0) {
                return res.status(404).json({ status: 404, message: 'Profile not found' });
            }

            if (results[0].status == "503") {
                return res.status(503).json({ status: 503, message: 'Unverify code!' });
            }

            if (results[0].status === "406") {
                hewkawar_db.query('DELETE FROM `profile_auth` WHERE code = ?', [postData.code], (err, results) => {
                    if (err) {
                        console.error('Error executing MySQL query:', err);
                        return res.status(500).json({ status: 500, message: 'Internal Server Error' });
                    }
                });
                return res.status(406).json({ status: 406, message: 'User not allow to access' });
            }

            hewkawar_db.query('DELETE FROM `profile_auth` WHERE code = ?', [postData.code], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    return res.status(500).json({ status: 500, message: 'Internal Server Error' });
                }
            });

            return res.status(200).json(results[0]);
        }
    });
});

app.post('/oauth2/login', (req, res) => {
    const postData = req.body;

    if (!postData.redirect_url) {
        return res.status(400).json({ status: 400, message: "No redirect_url Found!" });
    }

    if (!utilts.isURL(postData.redirect_url)) {
        return res.status(401).json({ status: 401, message: "Unidentify redirect_url!" });
    }

    const code = utilts.generateRandomString(50);

    hewkawar_db.query('INSERT INTO `profile_auth`(`code`) VALUES (?)', [code], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    const originalUrl = 'https://www.hewkawar.xyz/auth/authorize';

    const paramsToAdd = {
        redirect: postData.redirect_url,
        code: code,
    };

    const parsedUrl = new URL(originalUrl);

    for (const key in paramsToAdd) {
        parsedUrl.searchParams.set(key, paramsToAdd[key]);
    }

    const loginURL = parsedUrl.toString();

    return res.status(201).json({ status: 201, url: loginURL, code: code });
});

app.get('/app/hstudio/info', async (req, res) => {
    let h0, h1, cpuload;

    cpuload = utilts.getCpuLoad();

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    await axios.get('http://192.168.0.245:1550/status')
        .then((response) => {
            h0 = response.data;
        })
        .catch((error) => {
            h0 = { error: 500, message: "Can't Get bot Status" }
        })

    await axios.get('http://192.168.0.245:1551/status')
        .then((response) => {
            h1 = response.data;
        })
        .catch((error) => {
            h1 = { error: 500, message: "Can't Get bot Status" }
        })

    const botdata = {
        server: {
            cpu: cpuload,
            ram: usedMemory,
        },
        hstudio: {
            0: h0,
            1: h1
        }
    };

    return res.status(200).json(botdata);
});

app.post('/app/hstuido/config', async (req, res) => {
    const postData = req.body;

    if (!postData.id) {
        return res.status(400).json({ error: 'id is required' });
    }

    try {
        let configdata = await utilts.getHstudioConfig(hstudio_db, postData.id);

        if (!configdata) {
            await utilts.newHstudioConfig(hstudio_db, postData.id);
            configdata = await utilts.getHstudioConfig(hstudio_db, postData.id);
        }

        let speed, loop, volume;
        if (postData.speed) {
            speed = postData.speed;
        }

        if (postData.loop) {
            loop = postData.loop;
        }

        if (postData.volume) {
            volume = postData.volume;
        }

        await utilts.updateHstudioConfig(hstudio_db, postData.id, loop, speed, volume);

        configdata = await utilts.getHstudioConfig(hstudio_db, postData.id);

        return res.status(202).json(configdata)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/app/hstuido/config', async (req, res) => {
    const id = req.query.id;

    if (!id) {
        return res.status(400).json({ error: 'ID parameter is required' });
    }

    try {
        let configdata = await utilts.getHstudioConfig(hstudio_db, id);

        if (!configdata) {
            await utilts.newHstudioConfig(hstudio_db, id);
            configdata = await utilts.getHstudioConfig(hstudio_db, id);
        }

        return res.status(200).json(configdata);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// app.get('/app/m2bot/auth/discord/callback', async (req, res) => {
//    const code = req.query.code;
//    const error = req.query.error;

//    if (error) {
//         return res.redirect('http://127.0.0.1:5500/link.html?error=access_denied')
//    } else if (code) {
//         const token = generateRandomString(20);


//    }
// });

app.get('/app/m2bot/voicechat', async (req, res) => {
    const VoiceChats = await utilts.getM2BotVoiceChannel(m2bot_db);

    const VoiceChannelList = []

    VoiceChats.forEach(VoiceChat => {
        const VoiceChannel = {
            ID: VoiceChat.id,
            Channel: {
                ID: VoiceChat.channel_id,
                Type: VoiceChat.channel_type,
                Name: VoiceChat.channel_name,
            },
            Member: {
                ID: VoiceChat.member_id,
                Name: VoiceChat.member_name,
            },
            TimeStamp: VoiceChat.timestemp,
        }

        VoiceChannelList.push(VoiceChannel);
    });

    return res.status(200).json(VoiceChannelList);
});

app.post('/app/m2bot/voicechat', async (req, res) => {
    const { ChannelID, ChannelType, ChannelName, MemberID, MemberUsername } = req.body;

    if (!ChannelID) {
        return res.status(400).json({ status: 2, message: "Undefined ChannelID" });
    } else if (!ChannelType) {
        return res.status(400).json({ status: 3, message: "Undefined ChannelType" });
    } else if (!ChannelName) {
        return res.status(400).json({ status: 4, message: "Undefined ChannelName" });
    } else if (!MemberID) {
        return res.status(400).json({ status: 5, message: "Undefined MemberID" });
    } else if (!MemberUsername) {
        return res.status(400).json({ status: 6, message: "Undefined MemberUsername" });
    }

    const InsertStauts = await utilts.newM2BotVoiceChannel(m2bot_db, ChannelID, ChannelType, ChannelName, MemberID, MemberUsername);

    if (InsertStauts) {
        const Response = {
            status: 1,
            message: "Insert to database Success",
            detail: {
                ChannelID: ChannelID,
                ChannelType: ChannelType,
                ChannelName: ChannelName,
                MemberID: MemberID,
                MemberUsername: MemberUsername,
            }
        };

        return res.status(201).json(Response);
    } else {
        return res.status(500).json({ status: 7, message: "Can't Insert to database" })
    }
});

app.delete('/app/m2bot/voicechat', async (req, res) => {
    const { ChannelID } = req.body;

    if (!ChannelID) {
        return res.status(400).json({ status: 2, message: "Unavailable ChannelID" });
    }

    const getInfo = await utilts.getM2BotVoiceChannel(m2bot_db, ChannelID);
    const deleteStauts = await utilts.deleteM2BotVoiceChannel(m2bot_db, ChannelID);

    if (getInfo && deleteStauts) {
        const Response = {
            status: 1,
            message: "Delete to database Success",
            detail: getInfo,
        };

        return res.status(201).json(Response);
    } else {
        return res.status(500).json({ status: 7, message: "Can't Delete data in database" })
    }
});

app.post('/app/m2bot/verify/link', async (req, res) => {
    const { email, discordId } = req.body;
    if (!email) return res.status(400).json({ status: 1, message: "Unknow email"});
    if (!discordId) return res.status(400).json({ status: 2, message: "Unknow discordId"});

    let accountData = await utilts.getM2BotAccount(m2bot_db, discordId, email, "GetStatus");

    if (accountData) {
        utilts.updateM2BotAccountStatus(m2bot_db, discordId, email, 'active');

        return res.status(200).json({ status: 0, message: "Ok", detail: { ref: null, active: true}});
    } else {
        const otp = utilts.generateEmailOTP();
        const refno1 = utilts.generateRandomString(6);
    
        utilts.sendEmail(email, `${otp} ยืนยันอีเมล - Discord สองทับแปดบวกเก้า`, `สวัสดี\nคุณได้ทำการยืนยันอีเมลล์ โดยรหัสยืนยันของคุณคือ ${otp}\nรหัสอ้งอิง : ${refno1}\nสองทับแปดบวกเก้า\nอีเมลนี้ถูกส่งด้วยระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้`,`สวัสดี<br>คุณได้ทำการยืนยันอีเมลล์ โดยรหัสยืนยันของคุณคือ <span style="color: #f1c40f;">${otp}</span><br>รหัสอ้งอิง : ${refno1}<br>สองทับแปดบวกเก้า<br>อีเมลนี้ถูกส่งด้วยระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้`)
    
        await utilts.newM2BotAuthOtp(m2bot_db, discordId, refno1, email, otp);
    
        return res.status(201).json({ status: 0, message: "Ok", detail: { ref: refno1, active: false}});
    }
});

app.post('/app/m2bot/verify/otp', async (req, res) => {
    const { discordId, otp, ref } = req.body;

    if (!discordId) return res.status(400).json({ status: 1, message: "Unknow discordId"});
    if (!ref) return res.status(400).json({ status: 2, message: "Unknow ref"});
    if (!otp) return res.status(400).json({ status: 3, message: "Unknow otp"});

    const sessionOtpData = await utilts.getM2BotAuthSessionOtp(m2bot_db, discordId, ref);

    if (!sessionOtpData || sessionOtpData.status !== "pendingverify") return res.status(400).json({ status: 4, message: "Otp Expire"});

    if (sessionOtpData.otp === otp) {
        let accountData = await utilts.getM2BotAccount(m2bot_db, sessionOtpData.discord_id, sessionOtpData.email, "GetAccount");
        if (!accountData) {
            await utilts.newM2BotAccount(m2bot_db, sessionOtpData.discord_id, sessionOtpData.email);
            accountData = await utilts.getM2BotAccount(m2bot_db, sessionOtpData.discord_id, sessionOtpData.email, "GetAccount");
        }

        await utilts.updateStatusM2BotAuthSessionOtp(m2bot_db, sessionOtpData.discord_id, "verified");
        
        return res.status(200).json({ verify: "success" });
    } else {
        await utilts.updateStatusM2BotAuthSessionOtp(m2bot_db, sessionOtpData.discord_id, "verify_fail");

        return res.status(401).json({ verify: "fail" });
    }
});

app.get('/app/m2bot/verify/check', async (req, res) => {
    const { id } = req.query;

    if (!id) return res.status(400).json({ status: 1, message: "Unknow id"});

    let accountData = await utilts.getM2BotAccount(m2bot_db, id, null, "GetAccount");

    if (!accountData) return res.status(200).json({ status: 2, access: false, message: "Account Not Found", account: { discordId: id, email: null}})

    console.log(accountData);

    return res.status(200).json({ status: 0, access: true, message: "Member", account: { discordId: accountData.discord_id, email: accountData.email}})
});

app.get('/app/m2bot/member', async (req, res) => {
    const response = {
        M: {
            1: {
                1: [null],
                2: [null],
                3: [null],
                4: [null],
                5: [null],
                6: [null],
                7: [null],
                8: [null],
                9: [null],
            },
            2: {
                1: [null],
                2: [null],
                3: [null],
                4: [null],
                5: [null],
                6: [null],
                7: [null],
                8: [23479, 23480, 23481, 23482, 23484, 23486, 23488, 23489, 23490, 23494, 23496, 23497, 23498, 23500, 23501, 23502, 23503, 23505, 23506, 23511, 23516, 23520, 23527, 23528, 23530, 23532, 23536, 23537, 23538, 23539, 23540, 23541, 23542, 23543, 23544, 23545],
                9: [23475, 23476, 23477, 23478, 23483, 23485, 23487, 23491, 23492, 23493, 23495, 23499, 23504, 23507, 23508, 23509, 23510, 23512, 23513, 23514, 23515, 23517, 23518, 23519, 23521, 23522, 23523, 23524, 23525, 23526, 23529, 23531, 23533, 23534, 23535, 23546],
            },
            3: {
                1: [null],
                2: [null],
                3: [null],
                4: [null],
                5: [null],
                6: [null],
                7: [null],
                8: [null],
                9: [null],
            },
            4: {
                1: [null],
                2: [null],
                3: [null],
                4: [null],
                5: [null],
                6: [null],
                7: [null],
                8: [null],
            },
            5: {
                1: [null],
                2: [null],
                3: [null],
                4: [null],
                5: [null],
                6: [null],
                7: [null],
                8: [null],
            },
            6: {
                1: [null],
                2: [null],
                3: [null],
                4: [null],
                5: [null],
                6: [null],
                7: [null],
                8: [null],
            },
            
        }
    }
    return res.status(200).json(response);
});

app.put('/app/m2bot/account/inactive', async (req, res) => {
    const { email, discordId } = req.body;

    if (!email) return res.status(400).json({ status: 1, message: "Unknow email"});
    if (!discordId) return res.status(400).json({ status: 2, message: "Unknow discordId"});

    const updatestatus = await utilts.updateM2BotAccountStatus(m2bot_db, discordId, email, 'inactive');

    if (!updatestatus) return res.status(500).json({ status: 3, message: "Someting Error"})
    return res.status(200).json({ status: 0, message: "Ok" });
});

app.post('/app/m2bot/transition', async (req, res) => {
    const { discordId, type, value } = req.body;

    if (!discordId) return res.status(400).json({ status: 1, message: "Unknow discordId"});
    if (!type) return res.status(400).json({ status: 2, message: "Unknow type"});
    if (!value) return res.status(400).json({ status: 3, message: "Unknow value"});

    const real_value = utilts.convertToString(value);

    const Insert = await utilts.newM2BotTransition(m2bot_db, discordId, type, real_value);

    if (!Insert) res.status(500).json({ status: 4, message: "Can't Add Data to Database"});
    return res.status(200).json({ status: 0, message: "Insert Success" });
});

app.get('/app/bank/session', async (req, res) => {
    const { session_id } = req.query;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    const response = {
        username: SessionData[0].username,
        displayname: SessionData[0].displayname,
        profileurl: SessionData[0].profileurl,
    }

    return res.status(200).json(response);
})

app.post('/app/bank/session', async (req, res) => {
    const { username, displayname, profileurl } = req.body;
    const userAgent = req.get('User-Agent');

    const session_id = utilts.generateRandomString(50);

    if (!username) {
        return res.status(400).json({ status: 1, message: "Undefined username" });
    } else if (!displayname) {
        return res.status(400).json({ status: 2, message: "Undefined displayname" });
    } else if (!profileurl) {
        return res.status(400).json({ status: 3, message: "Undefined profileurl" });
    }

    const insert = utilts.newBankSession(hewkawbank_db, session_id, username, displayname, profileurl, userAgent)

    if (insert) {
        const Response = {
            status: 0,
            message: "Create Session Success",
            detail: {
                session_id: session_id,
                username: username,
                displayname: displayname,
                profileurl: profileurl,
            }
        };

        return res.status(201).json(Response);
    } else {
        return res.status(500).json({ status: 5, message: "Can't Insert to database" })
    }
})

app.delete('/app/bank/session', async (req, res) => {
    const { session_id } = req.body;

    if (!session_id) {
        return res.status(400).json({ status: 2, message: "Undefined session_id" });
    }

    const getInfo = await utilts.getBankSession(hewkawbank_db, session_id);
    const deleteStauts = await utilts.clearBankSession(hewkawbank_db, session_id);

    if (getInfo && deleteStauts) {
        const Response = {
            status: 0,
            message: "Clear Session success",
            detail: getInfo,
        };

        return res.status(200).json(Response);
    } else {
        return res.status(500).json({ status: 6, message: "Can't Delete data in database" })
    }
})

app.get('/app/bank/balance', async (req, res) => {
    const { session_id } = req.query;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    try {
        let accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        if (!accountdata) {
            await utilts.newBankAccount(hewkawbank_db, SessionData[0].username);
            accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);
        }

        var currentDate = new Date();
        var currentYear = currentDate.getFullYear();
        var currentMonth = currentDate.getMonth() + 1;

        const dw = await utilts.getBankTransition(hewkawbank_db, SessionData[0].username, currentMonth, currentYear);

        const response = {
            status: 0,
            username: SessionData[0].username,
            account: {
                balance: accountdata.balance,
                balance_chip: accountdata.balance_chip,
                deposit: dw.deposit,
                withdraw: dw.withdraw,
            }
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.get('/app/bank/transition', async (req, res) => {
    const { session_id, month, year } = req.query;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    try {
        let accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        if (!accountdata) {
            await utilts.newBankAccount(hewkawbank_db, SessionData[0].username);
            accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);
        }

        const dw = await utilts.getBankTransition(hewkawbank_db, SessionData[0].username, month, year);

        const response = {
            status: 0,
            username: SessionData[0].username,
            account: {
                balance: accountdata.balance,
                balance_chip: accountdata.balance_chip,
                deposit: dw.deposit,
                withdraw: dw.withdraw,
                transition: {
                    deposits: dw.transition.deposits,
                    withdraws: dw.transition.withdraws,
                    convert_to_puas: dw.transition.convert_to_puas,
                    convert_to_thbs: dw.transition.convert_to_thbs
                }
            }
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.post('/app/bank/deposit', async (req, res) => {
    let { session_id, amount } = req.body;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    } else if (!amount) {
        return res.status(400).json({ status: 8, message: "Undefined amount" });
    }

    amount = parseInt(amount);
    if (!utilts.isInt(amount)) {
        return res.status(400).json({ status: 8, message: 'Allow amount only integer' });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    try {
        let accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        if (!accountdata) {
            await utilts.newBankAccount(hewkawbank_db, SessionData[0].username);
            accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);
        }

        await utilts.newBankTransition(hewkawbank_db, SessionData[0].username, "deposit", amount);

        const balance = parseInt(accountdata.balance) + parseInt(amount);

        await utilts.updateBankAccount(hewkawbank_db, SessionData[0].username, "balance", balance);

        const response = {
            status: 0,
            message: `Deposit ${amount} to ${SessionData[0].username}!`
        }

        let lineaccount = await utilts.getBankConnectAccountLine(hewkawbank_db, SessionData[0].username);

        accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        const username = SessionData[0].username;
        const date = utilts.getFormattedDate();
        const time = utilts.getCurrentTime();
        const total = parseInt(accountdata.balance) + parseInt(accountdata.balance_chip);
        const cash = parseInt(accountdata.balance);
        const pua_chip = parseInt(accountdata.balance_chip);

        if (lineaccount.uuid) {
            await axios.post('https://api.line.me/v2/bot/message/push', {
                "to": lineaccount.uuid,
                "messages": [
                    {
                        "type": "flex",
                        "altText": `รายการเงินเข้าจากบัญชี ${username} วันที่ ${date} เวลา ${time} จำนวนเงิน ${amount} บาท ยอดเงินคงเหลือ ${total}`,
                        "contents": {
                            "type": "bubble",
                            "header": {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "💵",
                                        "margin": "none",
                                        "align": "center",
                                        "flex": 1
                                    },
                                    {
                                        "type": "text",
                                        "text": "รายการเงินเข้า",
                                        "size": "lg",
                                        "weight": "bold",
                                        "flex": 9
                                    }
                                ]
                            },
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จากบัญชี",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${username}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ],
                                        "margin": "none"
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "วันที่",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${date}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "เวลา",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${time}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จำนวนเงิน",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${amount} บาท`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    }
                                ]
                            },
                            "footer": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "ยอดเงินคงเหลือ",
                                                "align": "start",
                                                "weight": "bold",
                                                "flex": 5
                                            },
                                            {
                                                "type": "text",
                                                "text": `${total}`,
                                                "align": "end",
                                                "weight": "bold",
                                                "flex": 5
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "THB",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${cash}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "PUA",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${pua_chip}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "uri",
                                            "label": "BankH",
                                            "uri": "https://bank.hewkawar.xyz/"
                                        },
                                        "style": "primary",
                                        "margin": "lg"
                                    }
                                ]
                            },
                            "styles": {
                                "body": {
                                    "separator": true
                                },
                                "footer": {
                                    "separator": true
                                }
                            }
                        }
                    }
                ]
            }, {
                headers: {
                    "Authorization": `Bearer 1hGj85AaJO3gjfLa5mCUpqwEuxE0SXGR5T1a1AUBMdkAVDHzRCuVQlgJbabDFsH2O9x66c8WpP9eqCrqBNXQU4FjEeP5cJ6R7gLVgZPJeR0j3bo7xhdSdvJDsHv1Rl9fj0uMhKRTR4GH6855vxjBhwdB04t89/1O/w1cDnyilFU=`
                }
            }).then(function (response) {
            }).catch(function (error) {
            });
        }

        await axios.post("https://discord.com/api/webhooks/1178009024143298590/XNR1JDPHw8sXrYRJ81Rs1s8h7s5y5sJSIZhG4XJA1LfBlNoos5RWWpHMkd-G3-Ldh4Vr", {
            embeds: [
                {
                    author: {
                        name: `${SessionData[0].username}`,
                        icon_url: `${SessionData[0].profileurl}`
                    },
                    title: `Deposited ${amount} THB.`,
                    color: discord.Colors.Green,
                    timestamp: new Date().toISOString(),
                },
            ]
        });
        return res.status(201).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/app/bank/withdraw', async (req, res) => {
    let { session_id, amount, currency } = req.body;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    } else if (!amount) {
        return res.status(400).json({ status: 8, message: "Undefined amount" });
    } else if (!currency) {
        return res.status(400).json({ status: 9, message: "Undefined currency" });
    }

    if (!currency === "thb" && !currency === "pua") {
        return res.status(400).json({ status: 10, message: "Unavailable currency" });
    }

    amount = parseInt(amount);
    if (!utilts.isInt(amount)) {
        return res.status(400).json({ status: 8, message: 'Allow amount only integer' });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    try {
        let accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        if (!accountdata) {
            await utilts.newBankAccount(hewkawbank_db, SessionData[0].username);
            accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);
        }

        if (currency === 'thb') {
            await utilts.newBankTransition(hewkawbank_db, SessionData[0].username, "withdraw_thb", amount);

            const balance = parseInt(accountdata.balance) - parseInt(amount);

            await utilts.updateBankAccount(hewkawbank_db, SessionData[0].username, "balance", balance);
        } else if (currency === 'pua') {
            await utilts.newBankTransition(hewkawbank_db, SessionData[0].username, "withdraw_pua", amount);

            const balance = parseInt(accountdata.balance_chip) - parseInt(amount);

            await utilts.updateBankAccount(hewkawbank_db, SessionData[0].username, "balance_pua", balance);
        }

        const response = {
            status: 0,
            message: `Withdraw ${amount} to ${SessionData[0].username}!`
        }

        let lineaccount = await utilts.getBankConnectAccountLine(hewkawbank_db, SessionData[0].username);

        accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        const username = SessionData[0].username;
        const date = utilts.getFormattedDate();
        const time = utilts.getCurrentTime();
        const total = parseInt(accountdata.balance) + parseInt(accountdata.balance_chip);
        const cash = parseInt(accountdata.balance);
        const pua_chip = parseInt(accountdata.balance_chip);

        if (lineaccount.uuid) {
            await axios.post('https://api.line.me/v2/bot/message/push', {
                "to": lineaccount.uuid,
                "messages": [
                    {
                        "type": "flex",
                        "altText": `รายการเงินออกจากบัญชี ${username} วันที่ ${date} เวลา ${time} จำนวนเงิน ${amount} บาท ยอดเงินคงเหลือ ${total}`,
                        "contents": {
                            "type": "bubble",
                            "header": {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "💵",
                                        "margin": "none",
                                        "align": "center",
                                        "flex": 1
                                    },
                                    {
                                        "type": "text",
                                        "text": "รายการเงินออก",
                                        "size": "lg",
                                        "weight": "bold",
                                        "flex": 9
                                    }
                                ]
                            },
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จากบัญชี",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${username}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ],
                                        "margin": "none"
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "วันที่",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${date}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "เวลา",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${time}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จำนวนเงิน",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${amount} บาท`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    }
                                ]
                            },
                            "footer": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "ยอดเงินคงเหลือ",
                                                "align": "start",
                                                "weight": "bold",
                                                "flex": 5
                                            },
                                            {
                                                "type": "text",
                                                "text": `${total}`,
                                                "align": "end",
                                                "weight": "bold",
                                                "flex": 5
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "THB",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${cash}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "PUA",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${pua_chip}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "uri",
                                            "label": "BankH",
                                            "uri": "https://bank.hewkawar.xyz/"
                                        },
                                        "style": "primary",
                                        "margin": "lg"
                                    }
                                ]
                            },
                            "styles": {
                                "body": {
                                    "separator": true
                                },
                                "footer": {
                                    "separator": true
                                }
                            }
                        }
                    }
                ]
            }, {
                headers: {
                    "Authorization": `Bearer 1hGj85AaJO3gjfLa5mCUpqwEuxE0SXGR5T1a1AUBMdkAVDHzRCuVQlgJbabDFsH2O9x66c8WpP9eqCrqBNXQU4FjEeP5cJ6R7gLVgZPJeR0j3bo7xhdSdvJDsHv1Rl9fj0uMhKRTR4GH6855vxjBhwdB04t89/1O/w1cDnyilFU=`
                }
            }).then(function (response) {
            }).catch(function (error) {
            });
        }

        await axios.post("https://discord.com/api/webhooks/1178009024143298590/XNR1JDPHw8sXrYRJ81Rs1s8h7s5y5sJSIZhG4XJA1LfBlNoos5RWWpHMkd-G3-Ldh4Vr", {
            embeds: [
                {
                    author: {
                        name: `${SessionData[0].username}`,
                        icon_url: `${SessionData[0].profileurl}`
                    },
                    title: `Withdrawed ${amount} THB.`,
                    color: discord.Colors.Red,
                    timestamp: new Date().toISOString(),
                },
            ]
        });
        return res.status(201).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/app/bank/convert/pua', async (req, res) => {
    let { session_id, amount } = req.body;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    } else if (!amount) {
        return res.status(400).json({ status: 8, message: "Undefined amount" });
    }

    amount = parseInt(amount);
    if (!utilts.isInt(amount)) {
        return res.status(400).json({ status: 8, message: 'Allow amount only integer' });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    try {
        let accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        if (!accountdata) {
            await utilts.newBankAccount(hewkawbank_db, SessionData[0].username);
            accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);
        }

        await utilts.newBankTransition(hewkawbank_db, SessionData[0].username, "convert_to_pua", amount);

        const balance = parseInt(accountdata.balance) - parseInt(amount);
        const balance_pua = parseInt(accountdata.balance_chip) + parseInt(amount);

        await utilts.updateBankAccount(hewkawbank_db, SessionData[0].username, "balance", balance);
        await utilts.updateBankAccount(hewkawbank_db, SessionData[0].username, "balance_pua", balance_pua);

        const response = {
            status: 0,
            message: `Convert ${amount} to PUA!`
        }

        let lineaccount = await utilts.getBankConnectAccountLine(hewkawbank_db, SessionData[0].username);

        accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        const username = SessionData[0].username;
        const date = utilts.getFormattedDate();
        const time = utilts.getCurrentTime();
        const total = parseInt(accountdata.balance) + parseInt(accountdata.balance_chip);
        const cash = parseInt(accountdata.balance);
        const pua_chip = parseInt(accountdata.balance_chip);

        if (lineaccount.uuid) {
            await axios.post('https://api.line.me/v2/bot/message/push', {
                "to": lineaccount.uuid,
                "messages": [
                    {
                        "type": "flex",
                        "altText": `รายการแปลงสกุลเงินจากบัญชี ${username} วันที่ ${date} เวลา ${time} จำนวนเงิน ${amount} บาท ยอดเงินคงเหลือ ${total}`,
                        "contents": {
                            "type": "bubble",
                            "header": {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "💷",
                                        "margin": "none",
                                        "align": "center",
                                        "flex": 1
                                    },
                                    {
                                        "type": "text",
                                        "text": "รายการแปลงสกุลเงิน",
                                        "size": "lg",
                                        "weight": "bold",
                                        "flex": 9
                                    }
                                ]
                            },
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จากบัญชี",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${username}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ],
                                        "margin": "none"
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "วันที่",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${date}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "เวลา",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${time}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จำนวนเงิน",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${amount} บาท`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    }
                                ]
                            },
                            "footer": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "ยอดเงินคงเหลือ",
                                                "align": "start",
                                                "weight": "bold",
                                                "flex": 5
                                            },
                                            {
                                                "type": "text",
                                                "text": `${total}`,
                                                "align": "end",
                                                "weight": "bold",
                                                "flex": 5
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "THB",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${cash}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "PUA",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${pua_chip}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "uri",
                                            "label": "BankH",
                                            "uri": "https://bank.hewkawar.xyz/"
                                        },
                                        "style": "primary",
                                        "margin": "lg"
                                    }
                                ]
                            },
                            "styles": {
                                "body": {
                                    "separator": true
                                },
                                "footer": {
                                    "separator": true
                                }
                            }
                        }
                    }
                ]
            }, {
                headers: {
                    "Authorization": `Bearer 1hGj85AaJO3gjfLa5mCUpqwEuxE0SXGR5T1a1AUBMdkAVDHzRCuVQlgJbabDFsH2O9x66c8WpP9eqCrqBNXQU4FjEeP5cJ6R7gLVgZPJeR0j3bo7xhdSdvJDsHv1Rl9fj0uMhKRTR4GH6855vxjBhwdB04t89/1O/w1cDnyilFU=`
                }
            }).then(function (response) {
            }).catch(function (error) {
            });
        }

        await axios.post("https://discord.com/api/webhooks/1178009024143298590/XNR1JDPHw8sXrYRJ81Rs1s8h7s5y5sJSIZhG4XJA1LfBlNoos5RWWpHMkd-G3-Ldh4Vr", {
            embeds: [
                {
                    author: {
                        name: `${SessionData[0].username}`,
                        icon_url: `${SessionData[0].profileurl}`
                    },
                    title: `Converted ${amount} THB to ${amount} PUA.`,
                    color: discord.Colors.Blue,
                    timestamp: new Date().toISOString(),
                },
            ]
        });
        return res.status(201).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/app/bank/convert/thb', async (req, res) => {
    let { session_id, amount } = req.body;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    } else if (!amount) {
        return res.status(400).json({ status: 8, message: "Undefined amount" });
    }

    amount = parseInt(amount);
    if (!utilts.isInt(amount)) {
        return res.status(400).json({ status: 8, message: 'Allow amount only integer' });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    try {
        let accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        if (!accountdata) {
            await utilts.newBankAccount(hewkawbank_db, SessionData[0].username);
            accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);
        }

        await utilts.newBankTransition(hewkawbank_db, SessionData[0].username, "convert_to_thb", amount);

        const balance = parseInt(accountdata.balance) + parseInt(amount);
        const balance_pua = parseInt(accountdata.balance_chip) - parseInt(amount);

        await utilts.updateBankAccount(hewkawbank_db, SessionData[0].username, "balance", balance);
        await utilts.updateBankAccount(hewkawbank_db, SessionData[0].username, "balance_pua", balance_pua);

        const response = {
            status: 0,
            message: `Convert ${amount} to THB!`
        }

        let lineaccount = await utilts.getBankConnectAccountLine(hewkawbank_db, SessionData[0].username);

        accountdata = await utilts.getBankAccount(hewkawbank_db, SessionData[0].username);

        const username = SessionData[0].username;
        const date = utilts.getFormattedDate();
        const time = utilts.getCurrentTime();
        const total = parseInt(accountdata.balance) + parseInt(accountdata.balance_chip);
        const cash = parseInt(accountdata.balance);
        const pua_chip = parseInt(accountdata.balance_chip);

        if (lineaccount.uuid) {
            await axios.post('https://api.line.me/v2/bot/message/push', {
                "to": lineaccount.uuid,
                "messages": [
                    {
                        "type": "flex",
                        "altText": `รายการแปลงสกุลเงินจากบัญชี ${username} วันที่ ${date} เวลา ${time} จำนวนเงิน ${amount} บาท ยอดเงินคงเหลือ ${total}`,
                        "contents": {
                            "type": "bubble",
                            "header": {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "💷",
                                        "margin": "none",
                                        "align": "center",
                                        "flex": 1
                                    },
                                    {
                                        "type": "text",
                                        "text": "รายการแปลงสกุลเงิน",
                                        "size": "lg",
                                        "weight": "bold",
                                        "flex": 9
                                    }
                                ]
                            },
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จากบัญชี",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${username}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ],
                                        "margin": "none"
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "วันที่",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${date}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "เวลา",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${time}`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "จำนวนเงิน",
                                                "align": "start",
                                                "flex": 4
                                            },
                                            {
                                                "type": "text",
                                                "text": `${amount} บาท`,
                                                "align": "end",
                                                "flex": 6
                                            }
                                        ]
                                    }
                                ]
                            },
                            "footer": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "ยอดเงินคงเหลือ",
                                                "align": "start",
                                                "weight": "bold",
                                                "flex": 5
                                            },
                                            {
                                                "type": "text",
                                                "text": `${total}`,
                                                "align": "end",
                                                "weight": "bold",
                                                "flex": 5
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "THB",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${cash}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "PUA",
                                                "align": "start",
                                                "flex": 2
                                            },
                                            {
                                                "type": "text",
                                                "text": `${pua_chip}`,
                                                "align": "end",
                                                "flex": 8
                                            }
                                        ]
                                    },
                                    {
                                        "type": "button",
                                        "action": {
                                            "type": "uri",
                                            "label": "BankH",
                                            "uri": "https://bank.hewkawar.xyz/"
                                        },
                                        "style": "primary",
                                        "margin": "lg"
                                    }
                                ]
                            },
                            "styles": {
                                "body": {
                                    "separator": true
                                },
                                "footer": {
                                    "separator": true
                                }
                            }
                        }
                    }
                ]
            }, {
                headers: {
                    "Authorization": `Bearer 1hGj85AaJO3gjfLa5mCUpqwEuxE0SXGR5T1a1AUBMdkAVDHzRCuVQlgJbabDFsH2O9x66c8WpP9eqCrqBNXQU4FjEeP5cJ6R7gLVgZPJeR0j3bo7xhdSdvJDsHv1Rl9fj0uMhKRTR4GH6855vxjBhwdB04t89/1O/w1cDnyilFU=`
                }
            }).then(function (response) {
            }).catch(function (error) {
            });
        }

        await axios.post("https://discord.com/api/webhooks/1178009024143298590/XNR1JDPHw8sXrYRJ81Rs1s8h7s5y5sJSIZhG4XJA1LfBlNoos5RWWpHMkd-G3-Ldh4Vr", {
            embeds: [
                {
                    author: {
                        name: `${SessionData[0].username}`,
                        icon_url: `${SessionData[0].profileurl}`
                    },
                    title: `Converted ${amount} PUA to ${amount} THB.`,
                    color: discord.Colors.Blue,
                    timestamp: new Date().toISOString(),
                },
            ]
        });
        return res.status(201).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/app/bank/connect', async (req, res) => {
    const { platform, uuid, username, session_id } = req.body;
    const userAgent = req.get('User-Agent');

    if (!session_id) {
        return res.status(400).json({ status: 1, message: "Undefined session_id" });
    } else if (!platform) {
        return res.status(400).json({ status: 12, message: "Undefined platform" });
    } else if (!uuid) {
        return res.status(400).json({ status: 13, message: "Undefined uuid" });
    } else if (!username) {
        return res.status(400).json({ status: 14, message: "Undefined username" });
    }

    if (platform !== "line") {
        return res.status(400).json({ status: 15, message: "Unsupport platform" });
    }

    const SessionData = await utilts.getBankSession(hewkawbank_db, session_id);

    if (!SessionData) {
        return res.status(400).json({ status: 6, message: 'Undefined Session' });
    }

    if (SessionData[0].status === 'logouted') {
        return res.status(401).json({ status: 7, message: 'Session Expired' });
    }

    if (SessionData[0].useragent !== userAgent) {
        return res.status(401).json({ status: 11, message: 'Different User-Agent' });
    }

    if (SessionData[0].username !== username) {
        return res.status(401).json({ status: 16, message: 'Different username' });
    }


    try {
        let accountdata = await utilts.getBankConnectAccountLine(hewkawbank_db, SessionData[0].username);

        if (!accountdata) {
            await utilts.newBankConnectAccountLine(hewkawbank_db, SessionData[0].username, uuid);
            accountdata = await utilts.getBankConnectAccountLine(hewkawbank_db, SessionData[0].username);
        }

        await utilts.updateBankConnectAccountLine(hewkawbank_db, SessionData[0].username, uuid);

        const response = {
            status: 0,
            message: `Connect to Line Success!`,
            uuid: uuid
        }

        const access_token = "1hGj85AaJO3gjfLa5mCUpqwEuxE0SXGR5T1a1AUBMdkAVDHzRCuVQlgJbabDFsH2O9x66c8WpP9eqCrqBNXQU4FjEeP5cJ6R7gLVgZPJeR0j3bo7xhdSdvJDsHv1Rl9fj0uMhKRTR4GH6855vxjBhwdB04t89/1O/w1cDnyilFU=";

        await axios.post('https://api.line.me/v2/bot/message/push', {
            "to": uuid,
            "messages": [
                {
                    "type": "text",
                    "text": `เชื่อมต่อกับ ${SessionData[0].displayname} สำเร็จ!`
                }
            ]
        }, {
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        }).then(function (response) {
        }).catch(function (error) {
        });

        await axios.post("https://discord.com/api/webhooks/1178009024143298590/XNR1JDPHw8sXrYRJ81Rs1s8h7s5y5sJSIZhG4XJA1LfBlNoos5RWWpHMkd-G3-Ldh4Vr", {
            embeds: [
                {
                    author: {
                        name: `${SessionData[0].username}`,
                        icon_url: `${SessionData[0].profileurl}`
                    },
                    title: `Connect to Line Success!`,
                    color: discord.Colors.Purple,
                    timestamp: new Date().toISOString(),
                },
            ]
        });
        return res.status(201).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/app/playground/cweb/send-message', async (req, res) => {
    await axios.post("http://192.168.0.245:2414/send-message", req.body).then(response => {
        return res.status(response.status).json(response.data);
    }).catch(error => {
        console.log(error);
        return res.status(error.response.status).json(error.response.data);
    });
});

app.post('/app/bank/line/webhook', async (req, res) => {
    const access_token = "1hGj85AaJO3gjfLa5mCUpqwEuxE0SXGR5T1a1AUBMdkAVDHzRCuVQlgJbabDFsH2O9x66c8WpP9eqCrqBNXQU4FjEeP5cJ6R7gLVgZPJeR0j3bo7xhdSdvJDsHv1Rl9fj0uMhKRTR4GH6855vxjBhwdB04t89/1O/w1cDnyilFU=";
    if (req.body.events) {
        req.body.events.forEach(event => {
            if (event.type === "message") {
                if (event.message.type === "text") {
                    if (event.message.text === "connect") {
                        axios.post('https://api.line.me/v2/bot/message/reply', {
                            "replyToken": event.replyToken,
                            "messages": [
                                {
                                    "type": "template",
                                    "altText": "เข้าสู่ระบบด้วย BankH",
                                    "template": {
                                        "type": "buttons",
                                        "title": "เข้าสู่ระบบด้วย BankH",
                                        "text": "คลิกที่ เข้าสู่ระบบ",
                                        "actions": [
                                            {
                                                "type": "uri",
                                                "label": "เข้าสู่ระบบ",
                                                "uri": `https://bank.hewkawar.xyz/connect/line?uuid=${encodeURIComponent(event.source.userId)}`
                                            }
                                        ]
                                    }
                                }
                            ]
                        }, {
                            headers: {
                                "Authorization": `Bearer ${access_token}`
                            }
                        }).then(function (response) {
                        }).catch(function (error) {
                        });
                    } else {
                        axios.post('https://api.line.me/v2/bot/message/reply', {
                            "replyToken": event.replyToken,
                            "messages": [
                                {
                                    "type": "text",
                                    "text": "ขออภัยบอทไม่สามารถตอบกลับได้"
                                }
                            ]
                        }, {
                            headers: {
                                "Authorization": `Bearer ${access_token}`
                            }
                        }).then(function (response) {
                        }).catch(function (error) {
                        });
                    }
                } else {
                    axios.post('https://api.line.me/v2/bot/message/reply', {
                        "replyToken": event.replyToken,
                        "messages": [
                            {
                                "type": "text",
                                "text": "ขออภัยบอทไม่สามารถตอบกลับได้"
                            }
                        ]
                    }, {
                        headers: {
                            "Authorization": `Bearer ${access_token}`
                        }
                    }).then(function (response) {
                    }).catch(function (error) {
                    });
                }
            }
        });
    }

    return res.status(200).json(req.body);
});

app.post('/donate/truemoney/voucher', async (req, res) => {
    const { voucher } = req.body;

    if (!voucher) return res.status(400).json({ status: 1, type: "FAIL", code: "VOUCHER_EMPTY", message: "voucher cannot be empty." });

    const tw = await utilts.redeemVouchers("0610739386", voucher);

    res.status(200).json(tw);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
