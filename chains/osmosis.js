require('dotenv').config()
const { EmbedBuilder } = require('discord.js');
const WebSocket = require('ws');
const mintscanUrlAccount = 'https://www.mintscan.io/osmosis/account/'
const mintscanUrlTxs = 'https://www.mintscan.io/osmosis/txs/'

const MSG_TRANSFERT  = '/ibc.applications.transfer.v1.MsgTransfer'
const MSG_DELEGATE   = '/cosmos.staking.v1beta1.MsgUndelegate'
const MSG_UNDELEGATE = '/cosmos.staking.v1beta1.MsgDelegate'

let ws = ''

const startOsmoWs =  async () => { 
  ws = new WebSocket(process.env.WS_OSMOSIS)
}

const startOsmo =  async (datas, interaction, client) => {  
  
  ws.on('open', function open() {
    ws.send(JSON.stringify({
      "method":"subscribe",
      "params": ["tm.event='Tx'"],
      "id":"1",
      "jsonrpc":"2.0"
    }))
  })

  ws.on('close', function close() {
    console.log('disconnected');
  })
  
  ws.on('message', function incoming(data) {

    var finalData = JSON.parse(data.toString('utf-8'))
    if (!finalData.result.events || typeof finalData.result.events['message.action'] === 'undefined') {
      return
    }

    switch (finalData.result.events['message.action'][0]) {
      case MSG_TRANSFERT:
        let detailData = JSON.parse(finalData.result.events['send_packet.packet_data'][0])          
        const uDenom = detailData.denom.split('/')[-1]
  
        msgFields = [
          { name: '⬆️ From', value: detailData.sender },
          { name: '⬇️ To', value: detailData.receiver },
          { name: '🪙  Amount', value: detailData.amount + ' ' + uDenom, inline: true },
        ]
        sendDiscordAlert(client, finalData.result.events['tx.hash'][0], msgFields)
        break

      case MSG_DELEGATE:
        msgFields = [
          { name: '⬆️ From', value: finalData.result.events['unbond.validator'] },
          { name: '🪙  Amount', value: finalData.result.events['unbond.amount'] },
        ]
        sendDiscordAlert(client, finalData.result.events['tx.hash'][0], msgFields)
        break

      case MSG_UNDELEGATE:
        msgFields = [
          { name: '⬆️ To delegator', value: finalData.result.events['delegate.validator'][0] },
          { name: '🪙  Amount', value: finalData.result.events['delegate.amount'][0] },
        ]
        sendDiscordAlert(client, finalData.result.events['tx.hash'][0], msgFields)
        break
      default:
        console.log('not supported msg ', finalData.result.events['message.action'][0])
    }     
  })     
}

const stopOsmoWs =  async () => { 
  ws.close()
}

function sendDiscordAlert(client, txHash, msgFields) {
  msg = createDiscordMSG(txHash, msgFields)
  client.channels.cache.get(process.env.OSMO_CHANNEL_DELEGATE).send({ embeds: [msg] })  
}

function createDiscordMSG(txHash, msgFields) {
  const msg = new EmbedBuilder()
  .setColor(0x0099FF)
  .setAuthor({ name: 'New IBC Tx', iconURL: 'https://coindataflow.com/uploads/coins/osmosis.png', url: mintscanUrlTxs+'/'+txHash })
  .setDescription('A new transaction has been detected! \nFind all the information relating to this transaction below')
  .setThumbnail('https://coindataflow.com/uploads/coins/osmosis.png')
  .addFields(...msgFields, { name: '🔗  Tx hash', value: txHash })
  .setTimestamp()
  .setFooter({ text: 'AAA MetaHuahua', iconURL: 'https://d1fdloi71mui9q.cloudfront.net/YpCdNy3jRSycdDR8FQEN_0Wq62yUa4yV6dBuf' });
  return msg
}

module.exports = { startOsmo, startOsmoWs, stopOsmoWs }
