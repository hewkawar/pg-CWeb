const axios = require('axios');
const nodemailer = require('nodemailer');
const os = require('os');

function generateRandomString(length) {
    const characterPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characterPool.length);
        randomString += characterPool.charAt(randomIndex);
    }

    return randomString;
};

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
};

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
};

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
};

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
            };
        });
    });
};

async function newHstudioConfig(DB, id) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `config`(`id`) VALUES (?)", [id], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

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
    };

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
    };

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
    };
};


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
};

async function newAccountOAuth(DB, token, access_token) {
    await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`)
        .then((res) => {
            console.log(res);
        })
        .catch((error) => {
            console.error(error);
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
};

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
};

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
};

async function getM2BotVoiceChannel(DB, ChannelID) {
    if (ChannelID) {
        return new Promise((resolve, reject) => {
            DB.query('SELECT * FROM `auto_voicechat` WHERE `channel_id` = ?', [ChannelID], (err, results) => {
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
};

async function newBankSession(DB, SessionId, Username, DisplayName, ProfileUrl, UserAgent) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `session`(`session_id`, `username`, `displayname`, `profileurl`, `useragent`) VALUES (?, ?, ?, ?, ?)", [SessionId, Username, DisplayName, ProfileUrl, UserAgent], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function getBankSession(DB, SessionId) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM `session` WHERE `session_id` = ?', [SessionId], (err, results) => {
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
};

async function clearBankSession(DB, SessionId) {
    return new Promise((resolve, reject) => {
        DB.query("UPDATE `session` SET `status`= 'logouted' WHERE `session_id` = ?;", [SessionId], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function getBankAccount(DB, username) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM account WHERE username = ?', [username], (err, results) => {
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
};

async function newBankAccount(DB, username) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `account`(`username`) VALUES (?)", [username], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function updateBankAccount(DB, username, type, balance) {
    if (type === 'balance') {
        new Promise((resolve, reject) => {
            DB.query("UPDATE `account` SET `balance`= ? WHERE `username` = ?", [balance, username], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            })
        });
    } else if (type === 'balance_pua') {
        new Promise((resolve, reject) => {
            DB.query("UPDATE `account` SET `balance_chip`= ? WHERE `username` = ?", [balance, username], (err, results) => {
                if (err) {
                    console.error('Error executing MySQL query:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            })
        });
    }
};

async function newBankTransition(DB, username, type, amount) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `transition`(`account`, `type`, `amount`) VALUES (?, ?, ?)", [username, type, amount], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function getBankDeposit(DB, username, month, year) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM `transition` WHERE `account`= ? AND `type`= "deposit" AND MONTH(`timestamp`) = ? AND YEAR(`timestamp`) = ?;', [username, month, year], (err, results) => {
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
};

async function getBankWithdraw(DB, username, month, year) {
    return new Promise((resolve, reject) => {
        DB.query("SELECT * FROM `transition` WHERE `account` = ? AND (`type` = 'withdraw' OR `type` = 'withdraw_thb' OR `type` = 'withdraw_pua') AND MONTH(`timestamp`) = ? AND YEAR(`timestamp`) = ?;", [username, month, year], (err, results) => {
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
};

async function getBankConvertToPUA(DB, username, month, year) {
    return new Promise((resolve, reject) => {
        DB.query("SELECT * FROM `transition` WHERE `account` = ? AND (`type` = 'convert_to_pua') AND MONTH(`timestamp`) = ? AND YEAR(`timestamp`) = ?;", [username, month, year], (err, results) => {
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
};

async function getBankConvertToTHB(DB, username, month, year) {
    return new Promise((resolve, reject) => {
        DB.query("SELECT * FROM `transition` WHERE `account` = ? AND (`type` = 'convert_to_thb') AND MONTH(`timestamp`) = ? AND YEAR(`timestamp`) = ?;", [username, month, year], (err, results) => {
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
};

async function getBankTransition(DB, username, month, year) {

    const deposit = await getBankDeposit(DB, username, month, year);
    const withdraw = await getBankWithdraw(DB, username, month, year);
    const convert_to_pua = await getBankConvertToPUA(DB, username, month, year);
    const convert_to_thb = await getBankConvertToTHB(DB, username, month, year);

    let deposit_amount = 0;
    let withdraw_amount = 0;

    deposit.forEach(item => {
        deposit_amount = deposit_amount + item.amount;
    });

    withdraw.forEach(item => {
        withdraw_amount = withdraw_amount + item.amount;
    });


    return {
        deposit: deposit_amount,
        withdraw: withdraw_amount,
        transition: {
            deposits: deposit,
            withdraws: withdraw,
            convert_to_puas: convert_to_pua,
            convert_to_thbs: convert_to_thb
        }
    };
};

function isInt(variable) {
    return typeof variable === 'number' && Number.isInteger(variable);
};

async function getBankConnectAccountLine(DB, username) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM connect_to_line_live WHERE username = ?', [username], (err, results) => {
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
};

async function newBankConnectAccountLine(DB, username) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `connect_to_line_live`(`username`) VALUES (?)", [username], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function updateBankConnectAccountLine(DB, username, uuid) {
    new Promise((resolve, reject) => {
        DB.query("UPDATE `connect_to_line_live` SET `uuid`= ?, `status` = 'connected' WHERE `username` = ?", [uuid, username], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

function getCurrentTime() {
    const now = new Date();

    // Adjusting for GMT+7 timezone
    const gmtOffset = 7;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmtTime = new Date(utc + 3600000 * gmtOffset);

    const hours = gmtTime.getHours().toString().padStart(2, '0');
    const minutes = gmtTime.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    return currentTime;
};

function getFormattedDate() {
    const monthsInThai = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = monthsInThai[now.getMonth()];
    const year = now.getFullYear();

    const formattedDate = `${day} ${month} ${year}`;
    return formattedDate;
};

async function redeemVouchers(phone_number, voucher_code) {
    voucher_code = voucher_code.replace('https://gift.truemoney.com/campaign/?v=', '');

    if (!/^[a-z0-9]*$/i.test(voucher_code) || voucher_code.length <= 0) {
        return {
            status: 'FAIL',
            reason: 'Voucher only allows English alphabets or numbers, and cannot be empty.',
        };
    }

    const data = {
        mobile: phone_number,
        voucher_hash: voucher_code,
    };

    try {
        const response = await axios.post(`https://gift.truemoney.com/campaign/vouchers/${voucher_code}/redeem`, data, {
            headers: { 'Content-Type': 'application/json' },
        });

        const { status, message, data: responseData } = response.data.status;

        if (status === 'SUCCESS') {
            return {
                status: 'SUCCESS',
                amount: parseInt(responseData.voucher.redeemed_amount_baht),
            };
        } else {
            return {
                status: 'FAIL',
                reason: message,
            };
        }
    } catch (error) {
        return {
            status: 'FAIL',
            reason: 'An error occurred while redeeming the voucher.',
        };
    }
};

async function newM2BotAuthSession(DB, SessionId, DiscordId) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `session`(`session_id`, `discord_id`) VALUES (?,?)", [SessionId, DiscordId], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function newM2BotAuthOtp(DB, discordId, Ref, Email, Otp) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `otp`(`discord_id`, `ref`, `email`, `otp`) VALUES (?, ?, ?, ?)", [discordId, Ref, Email, Otp], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function getM2BotAuthSession(DB, SessionId) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM `session` WHERE `session_id` = ?;', [SessionId], (err, results) => {
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
};

async function verifyM2BotSession(DB, SessionId) {
    await DB.query('SELECT * FROM `session` WHERE `session_id` = ?;', [SessionId], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            console.error(err);
        } else {
            if (results.length === 0) {
                return false;
            } else {
                return true;
            }
        }
    });
};

async function getM2BotAuthSessionOtp(DB, discordId, Ref) {
    return new Promise((resolve, reject) => {
        DB.query('SELECT * FROM `otp` WHERE `discord_id` = ? AND `ref` = ?', [discordId, Ref], (err, results) => {
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
};

async function getM2BotAccount(DB, DiscordId, Email, Type) {
    if (Type === "GetStatus") {
        if (DiscordId && Email) {
            return new Promise((resolve, reject) => {
                DB.query('SELECT * FROM `account` WHERE `discord_id` = ? AND `email` = ?', [DiscordId, Email], (err, results) => {
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
        } else if (DiscordId) {
            return new Promise((resolve, reject) => {
                DB.query('SELECT * FROM `account` WHERE `discord_id` = ?', [DiscordId], (err, results) => {
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
        } else if (Email) {
            return new Promise((resolve, reject) => {
                DB.query('SELECT * FROM `account` WHERE `email` = ?', [Email], (err, results) => {
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
        }
    } else if (Type === 'GetAccount') {
        if (DiscordId && Email) {
            return new Promise((resolve, reject) => {
                DB.query('SELECT * FROM `account` WHERE `discord_id` = ? AND `email` = ? AND (`status` = \'verified\' OR `status` = \'active\')', [DiscordId, Email], (err, results) => {
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
        } else if (DiscordId) {
            return new Promise((resolve, reject) => {
                DB.query('SELECT * FROM `account` WHERE `discord_id` = ? AND (`status` = \'verified\' OR `status` = \'active\')', [DiscordId], (err, results) => {
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
        } else if (Email) {
            return new Promise((resolve, reject) => {
                DB.query('SELECT * FROM `account` WHERE `email` = ? AND (`status` = \'verified\' OR `status` = \'active\')', [Email], (err, results) => {
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
        }
    }
};

async function updateM2BotAccountStatus(DB, DiscordId, Email, Status) {
    return new Promise((resolve, reject) => {
        DB.query("UPDATE `account` SET `status`= ? WHERE `discord_id`= ? AND `email` = ?", [Status, DiscordId, Email], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function newM2BotAccount(DB, DiscordId, Email) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `account`(`discord_id`, `email`, `status`) VALUES (?, ?, ?)", [DiscordId, Email, "verified"], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function removeM2BotAuthSession(DB, SessionId) {
    return new Promise((resolve, reject) => {
        DB.query("DELETE FROM `session` WHERE `session_id` = ?", [SessionId], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function updateStatusM2BotAuthSession(DB, SessionId, Status) {
    return new Promise((resolve, reject) => {
        DB.query("UPDATE `session` SET `status`= ? WHERE `session_id` = ?", [Status, SessionId], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function updateStatusM2BotAuthSessionOtp(DB, discordId, Status) {
    return new Promise((resolve, reject) => {
        DB.query("UPDATE `otp` SET `status`= ? WHERE `discord_id` = ?", [Status, discordId], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

async function newM2BotTransition(DB, discordId, Type, Value) {
    return new Promise((resolve, reject) => {
        DB.query("INSERT INTO `transition`(`discord_id`, `type`, `value`) VALUES (?, ?, ?)", [discordId, Type, Value], (err, results) => {
            if (err) {
                console.error('Error executing MySQL query:', err);
                reject(err);
            } else {
                resolve(results);
            }
        })
    });
};

function generateEmailOTP(otpLength = 6) {
    let otp = '';

    for (let i = 0; i < otpLength; i++) {
        otp += Math.floor(Math.random() * 10);
    }

    return otp;
};

function sendEmail(emailTo, subject, text, html) {
    const transporter = nodemailer.createTransport({
        host: 'us2.smtp.mailhostbox.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'noreply@hewkawar.xyz', // Your email address
            pass: '(Y%l)UEeU7' // Your email password or an app-specific password
        }
    });

    // Email options
    const mailOptions = {
        from: 'noreply@hewkawar.xyz', // Sender address
        to: emailTo, // Recipient address
        subject: subject, // Subject line
        text: text, // Plain text body
        html: html // HTML body
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return {
                status: 1,
                detail: error
            };
        } else {
            return {
                status: 0,
                detail: info.response
            };
        }
    });
};

function convertToString(variable) {
    if (typeof variable === 'string') {
      // If the variable is already a string, return it as is
      return variable;
    } else if (typeof variable === 'number') {
      // If the variable is a number, convert it to a string
      return variable.toString();
    } else if (typeof variable === 'object') {
      // If the variable is an object or an array, convert it to JSON string
      try {
        return JSON.stringify(variable);
      } catch (error) {
        console.error('Error converting object to string:', error);
        return null; // Return null in case of an error
      }
    } else {
      // For other types, use the default toString() method
      return variable.toString();
    }
  }

module.exports = {
    generateRandomString,
    isURL,
    isInt,
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
    newBankSession,
    getBankSession,
    clearBankSession,
    getBankAccount,
    newBankAccount,
    updateBankAccount,
    newBankTransition,
    getBankTransition,
    getBankConnectAccountLine,
    newBankConnectAccountLine,
    updateBankConnectAccountLine,
    getCurrentTime,
    getFormattedDate,
    redeemVouchers,
    newM2BotAuthSession,
    getM2BotAuthSession,
    generateEmailOTP,
    sendEmail,
    newM2BotAuthOtp,
    verifyM2BotSession,
    getM2BotAuthSessionOtp,
    removeM2BotAuthSession,
    newM2BotAccount,
    getM2BotAccount,
    updateStatusM2BotAuthSession,
    updateStatusM2BotAuthSessionOtp,
    updateM2BotAccountStatus,
    newM2BotTransition,
    convertToString,
};