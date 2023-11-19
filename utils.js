const axios = require('axios');
const os = require('os');

function generateRandomString(length) {
    const characterPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characterPool.length);
        randomString += characterPool.charAt(randomIndex);
    }

    return randomString;
}

const isURL = (str) => {
    const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    return urlPattern.test(str);
};

function getCpuLoad() {
    const cpus = os.cpus();
    const numCores = cpus.length;

    let totalUsage = 0;
    for (const cpu of cpus) {
        const coreUsage = 100 - cpu.times.idle / (cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle) * 100;
        totalUsage += coreUsage;
    }

    const avgUsage = totalUsage / numCores;
    return avgUsage.toFixed(2);
}

async function getAuth(DB, id) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM auth WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                if (results.length === 0) {
                    reject(new Error('Data not found'));
                } else {
                    resolve(results[0]);
                }
            }
        });
    });
}

async function getProfile(DB, id) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM profile WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                if (results.length === 0) {
                    reject(new Error('Profile not found'));
                } else {
                    resolve(results[0]);
                }
            }
        });
    });
}

async function getHstudioConfig(DB, id) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM config WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                if (results.length === 0) {
                    resolve(null);
                } else {
                    resolve(results[0]);
                }
            }
        });
    });
    ;
}

async function newHstudioConfig(DB, id) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `config`(`id`) VALUES (?)", [id], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
}

async function updateHstudioConfig(DB, id, loop, speed, volume) {
    if (loop) {
        let updateLoop = new Promise((resolve, reject) => {
            DB.query("UPDATE `config` SET `loop`= ? WHERE `id` = ?", [loop, id], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            })
        });
    }

    if (speed) {
        let updateSpeed = new Promise((resolve, reject) => {
            DB.query("UPDATE `config` SET `speed`= ? WHERE `id` = ?", [speed, id], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            })
        });
    }

    if (volume) {
        let updateVolume = new Promise((resolve, reject) => {
            DB.query("UPDATE `config` SET `volume`= ? WHERE `id` = ?", [volume, id], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            })
        });
    }
}


async function newRawOAuth(DB) {
    const token = generateRandomString(25);

    new Promise((resolve, reject) => {
        DB.query("INSERT INTO `auth`(`token`) VALUES (?)", [token], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });

    return { token: token };
}

async function newAccountOAuth(DB, token, access_token) {
    await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`)
        .then((res) => {
            console.log(res);
        })
        .catch((error) => {
            console.log(error);
        });

    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `account`(`token`, `email`) VALUES (?, ?)", [token, email], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
}

async function newM2BotVoiceChannel(DB, ChannelID, ChannelType, ChannelName, MemberID, MemberUsername) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `auto_voicechat`(`channel_id`, `channel_type`, `channel_name`, `member_id`, `member_name`) VALUES (?, ?, ?, ?, ?)", [ChannelID, ChannelType, ChannelName, MemberID, MemberUsername], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
}

async function deleteM2BotVoiceChannel(DB, ChannelID) {
    return new Promise((resolve, reject) => {
        DB.query("DELETE FROM `auto_voicechat` WHERE `channel_id` = ?;", [ChannelID], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
}

async function getM2BotVoiceChannel(DB, ChannelID) {
    if (ChannelID) {
        return new Promise((resolve, reject) => {
            DB.query('SELECT * FROM `auto_voicechat` WHERE `channel_id` = ?', [ChannelID], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    reject(err);
                } else {
                    if (results.length === 0) {
                        resolve(null);
                    } else {
                        resolve(results);
                    }
                }
            });
        });
    } else {
        return new Promise((resolve, reject) => {
            DB.query('SELECT * FROM auto_voicechat', [], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    reject(err);
                } else {
                    if (results.length === 0) {
                        resolve([]);
                    } else {
                        resolve(results);
                    }
                }
            });
        });
    }
}

module.exports = {
    generateRandomString,
    isURL,
    getCpuLoad,
    getAuth,
    getProfile,
    getHstudioConfig,
    newHstudioConfig,
    updateHstudioConfig,
    newRawOAuth,
    newAccountOAuth,
    newM2BotVoiceChannel,
    getM2BotVoiceChannel,
    deleteM2BotVoiceChannel,
};