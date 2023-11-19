const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');
const discord = require('discord.js');
const os = require('os');
const utilts = require('./utils');

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

let hewkawar_db_c = false;
let hstudio_db_c = false;
let m2bot_db_c = false;

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

    if (!isURL(postData.redirect_url)) {
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
            await newHstudioConfig(postData.id);
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
            await newHstudioConfig(id);
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
    const VoiceChat = await utilts.getM2BotVoiceChannel(m2bot_db);

    const ServerList = VoiceChat;

    return res.status(200).json(ServerList);
});

app.post('/app/m2bot/voicechat', async (req, res) => {
    const { ChannelID, ChannelType, ChannelName, MemberID, MemberUsername } = req.body;

    if (!ChannelID) {
        return res.status(400).json({ status: 2, message: "Unavailable ChannelID"});
    } else if (!ChannelType) {
        return res.status(400).json({ status: 3, message: "Unavailable ChannelType"});
    } else if (!ChannelName) {
        return res.status(400).json({ status: 4, message: "Unavailable ChannelName"});
    } else if (!MemberID) {
        return res.status(400).json({ status: 5, message: "Unavailable MemberID"});
    } else if (!MemberUsername) {
        return res.status(400).json({ status: 6, message: "Unavailable MemberUsername"});
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
        return res.status(500).json({ status: 7, message: "Can't Insert to database"})
    }
});

app.post('/app/m2bot/voicechat/delete', async (req, res) => {
    const { ChannelID } = req.body;

    if (!ChannelID) {
        return res.status(400).json({ status: 2, message: "Unavailable ChannelID"});
    }

    const getInfo = await utilts.getM2BotVoiceChannel(m2bot_db, ChannelID);
    const deleteStauts = await utilts.deleteM2BotVoiceChannel(m2bot_db, ChannelID);

    if (deleteStauts) {
        const Response = {
            status: 1,
            message: "Delete to database Success",
            detail: getInfo,
        };

        return res.status(201).json(Response);
    } else {
        return res.status(500).json({ status: 7, message: "Can't Delete to database"})
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    axios.post(webhook_url, {
        embeds: [
            {
                title: 'HewkawAr API is Up',
                description: `Target : **[api.hewkawar.xyz](https://api.hewkawar.xyz)**\nHewkawAr Database : ${hewkawar_db_c}\nHStudio Database : ${hstudio_db_c}\nHewkawAr Database : ${m2bot_db_c}`,
                color: discord.Colors.Green,
                timestamp: new Date().toISOString(),
                thumbnail: { url: 'https://www.hewkawar.xyz/assets/uploads/up-arrow.png' },
            },
        ],
        avatar_url: "https://www.hewkawar.xyz/assets/favicon.png",
        username: "StatusTools"
    });
});
