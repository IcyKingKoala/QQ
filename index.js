const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const cors = require('cors');
const express = require('express');
const app = express();
app.use(cors());
app.use(express.json());

registerFont(path.join(__dirname, 'Gotham-Bold.ttf'), {
    family: 'Gotham',
    weight: 'bold',
    style: 'normal'
});

app.use((req, res, next) => {
    console.log('REQUEST:', req.method, req.url);
    console.log('Body:', req.body);
    next();
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Donation server is running', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

function getDonationEmoji(amount) {
    if (amount >= 10000000) return '<:starfall:1510588807878021251>';
    if (amount >= 1000000) return '<:smite:1510588705881194658>';
    if (amount >= 100000) return '<:nuke:1510588391962443868>';
    return '<:robux:1510588282717868062>';
}

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getColor(robux) {
    if (robux >= 10000000) return '#FB0505';
    if (robux >= 1000000) return '#EF1085';
    if (robux >= 100000) return '#FA04F2';
    if (robux >= 10000) return '#01d9FF';
    if (robux >= 1000) return '#FF8801';
    return '#00FF00';
}

async function fetchImageBuffer(url) {
    const _resp = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
            'Referer': 'https://discord.com'
        }
    });
    return loadImage(Buffer.from(_resp.data));
}

async function getRobloxThumbnail(userId) {
    try {
        const _resp = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
        if (_resp.data.data && _resp.data.data[0] && _resp.data.data[0].imageUrl) {
            return _resp.data.data[0].imageUrl;
        }
    } catch (_e) {
        console.log(`avatar fetch failed for ${userId}:`, _e.message);
    }
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;
}

async function createDonationImage(donatorAvatar, raiserAvatar, donatorName, raiserName, amount) {
    const _scale = 1872 / 700;
    const _w = 1872;
    const _h = 470;
    const canvas = createCanvas(_w, _h);
    const ctx = canvas.getContext('2d');
    const _color = getColor(amount);

    ctx.clearRect(0, 0, _w, _h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (amount >= 1000000) {
        const _g = ctx.createLinearGradient(0, _h * 0.6, 0, _h);
        _g.addColorStop(0, _color + '00');
        _g.addColorStop(0.5, _color + '33');
        _g.addColorStop(1, _color + '66');
        ctx.fillStyle = _g;
        ctx.fillRect(0, _h * 0.6, _w, _h * 0.4);
    }

    if (amount >= 10000000) {
        const _g2 = ctx.createLinearGradient(0, 0, 0, _h);
        _g2.addColorStop(0, _color + '00');
        _g2.addColorStop(0.5, _color + '33');
        _g2.addColorStop(1, _color + '66');
        ctx.fillStyle = _g2;
        ctx.fillRect(0, 0, _w, _h);
    }

    const _donatorimg = await fetchImageBuffer(donatorAvatar);
    const _raiserimg = await fetchImageBuffer(raiserAvatar);

    const _lefx = 130 * _scale;
    const _lefty = 71 * _scale;
    const _rightx = 560 * _scale;
    const _righty = 71 * _scale;
    const _r = 45 * _scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(_lefx, _lefty, _r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(_donatorimg, _lefx - _r, _lefty - _r, _r * 2, _r * 2);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(_rightx, _righty, _r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(_raiserimg, _rightx - _r, _righty - _r, _r * 2, _r * 2);
    ctx.restore();

    ctx.strokeStyle = _color;
    ctx.lineWidth = 4 * _scale;
    ctx.beginPath();
    ctx.arc(_lefx, _lefty, _r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(_rightx, _righty, _r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = `bold ${18 * _scale}px Gotham`;
    ctx.lineWidth = 5 * _scale;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeText(`@${donatorName}`, _lefx + 2 * _scale, 142 * _scale);
    ctx.fillText(`@${donatorName}`, _lefx + 2 * _scale, 142 * _scale);
    ctx.strokeText(`@${raiserName}`, _rightx + 2 * _scale, 142 * _scale);
    ctx.fillText(`@${raiserName}`, _rightx + 2 * _scale, 142 * _scale);

    const _text = formatCommas(amount);
    const _imgsize = 44 * _scale;
    ctx.font = `bold ${44 * _scale}px Gotham`;
    const _textwidth = ctx.measureText(_text).width;
    const _centerx = 365 * _scale;

    let _robuximg = null;
    try {
        _robuximg = await fetchImageBuffer('https://cdn.discordapp.com/emojis/1492725465931186246.png?size=512');
        console.log('robux emoji loaded ok');
    } catch (_e) {
        console.log('robux emoji failed:', _e.message);
    }

    if (_robuximg) {
        const _xpos = _centerx - (_textwidth / 2) - _imgsize - 5 * _scale;
        const _ypos = 38 * _scale;

        const _tcanvas = createCanvas(_imgsize, _imgsize);
        const _tctx = _tcanvas.getContext('2d');
        _tctx.drawImage(_robuximg, 0, 0, _imgsize, _imgsize);
        _tctx.globalCompositeOperation = 'source-in';
        _tctx.fillStyle = _color;
        _tctx.fillRect(0, 0, _imgsize, _imgsize);

        const _scanvas = createCanvas(_imgsize, _imgsize);
        const _sctx = _scanvas.getContext('2d');
        _sctx.drawImage(_robuximg, 0, 0, _imgsize, _imgsize);
        _sctx.globalCompositeOperation = 'source-in';
        _sctx.fillStyle = '#000000';
        _sctx.fillRect(0, 0, _imgsize, _imgsize);

        for (let _ox = -6; _ox <= 6; _ox++) {
            for (let _oy = -6; _oy <= 6; _oy++) {
                if (Math.sqrt(_ox * _ox + _oy * _oy) <= 6) {
                    ctx.drawImage(_scanvas, _xpos + _ox, _ypos + _oy);
                }
            }
        }
        ctx.drawImage(_tcanvas, _xpos, _ypos);
    }

    ctx.font = `bold ${44 * _scale}px Gotham`;
    ctx.fillStyle = _color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5 * _scale;
    ctx.strokeText(_text, _centerx, 72 * _scale);
    ctx.fillText(_text, _centerx, 72 * _scale);

    ctx.font = `bold ${28 * _scale}px Gotham`;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5.5 * _scale;
    ctx.strokeText('donated to', 345 * _scale, 110 * _scale);
    ctx.fillText('donated to', 345 * _scale, 110 * _scale);

    return canvas.toBuffer('image/png');
}

app.post('/donation', async (req, res) => {
    console.log('Body:', req.body);
    const { DonatorId, RaiserId, DonatorName, RaiserName, Amount } = req.body;

    const _isdonatoranon = DonatorId === 1 || DonatorName === 'Anonymous' || !DonatorName.startsWith('@');
    const _israiseranon = RaiserId === 1 || RaiserName === 'Anonymous' || !RaiserName.startsWith('@');

    const _donatoravatarid = _isdonatoranon ? 1 : DonatorId;
    const _raiseravatarid = _israiseranon ? 1 : RaiserId;
    const _donatorname = _isdonatoranon ? 'Anonymous' : DonatorName.replace('@', '');
    const _raisername = _israiseranon ? 'Anonymous' : RaiserName.replace('@', '');

    try {
        const _donatoravatar = await getRobloxThumbnail(_donatoravatarid);
        const _raiseravatar = await getRobloxThumbnail(_raiseravatarid);
        const _imagebuffer = await createDonationImage(_donatoravatar, _raiseravatar, _donatorname, _raisername, Amount);
        const _attachment = new AttachmentBuilder(_imagebuffer, { name: 'donation.png' });
        const _channel = await client.channels.fetch('1501708292718854174');
        await _channel.send({
            content: `${getDonationEmoji(Amount)} \`@${_donatorname}\` donated **<:robux:1510588282717868062>${formatCommas(Amount)} Robux** to \`@${_raisername}\``,
            embeds: [{
                color: parseInt(getColor(Amount).replace('#', ''), 16),
                image: { url: 'attachment://donation.png' },
                timestamp: new Date().toISOString(),
                footer: { text: 'Donated on' }
            }],
            files: [_attachment]
        });
        res.json({ success: true });
    } catch (_err) {
        console.log('FULL ERROR:', _err);
        res.status(500).json({ success: false, error: _err.message });
    }
});

client.on('ready', () => {
    console.log(`logged in ${client.user.tag}`);
});

const PORT = 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`server running on port ${PORT}`);
});

client.login(process.env.TOKEN);

const _keepalive = () => {
    setInterval(async () => {
        try {
            await axios.get('https://qq-fxek.onrender.com/health');
            console.log('keep alive ping sent');
        } catch (_e) {
            console.log('keep alive failed:', _e.message);
        }
    }, 14 * 60 * 1000);
};
_keepalive();
