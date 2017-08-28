var mqtt = require('mqtt')
const DEVICEID = 'yjb0001'

//设备状态
const IDLE = 0  //空闲
const OCCUPIED = 1 //使用中

const Device_Info = {
  deviceId: DEVICEID,
  status: IDLE,
}

const CONN_OPTION = {
  clientId: DEVICEID,
  will: {
    topic: 'offline',
    payload: JSON.stringify({
      deviceId: DEVICEID,
      time: Date.now(),
      message: '异常下线'
    })
  }
}

var client  = mqtt.connect('mqtt://123.56.216.122:1883', CONN_OPTION)

//设备上线
client.on('connect', function (connack) {
  console.log("connected" )
  var onlineMessage = {
    deviceId: DEVICEID,
    time: Date.now(),
  }
  client.publish('online', JSON.stringify(onlineMessage))
  Device_Info.status = IDLE   //设备状态-->空闲

  var topics = []
  topics.push('turnOn/' + DEVICEID)  //订阅开机消息

  client.subscribe(topics, function (error) {
    if(error) {
      console.log("subscribe error", error)
    } else {
      console.log("subscribe success, topics:", topics)
    }
  })
})

function handleTurnOn(message) {
  var Message = JSON.parse(message.toString())
  var deviceId = Message.deviceId
  var socketId = Message.socketId

  if(Device_Info.status === IDLE) {
    var successMessage = {
      socketId: socketId,
      deviceId: deviceId,
      time: Date.now(),
      status: OCCUPIED,
    }
    setTimeout(function () {
      client.publish('turnOnSuccess/' + deviceId, JSON.stringify(successMessage), function (error) {
        if(error) {
          console.log("publish turnOnSuccess error:", error)
        } else {
          Device_Info.status = OCCUPIED //设备状态-->使用中
          console.log("publish success, topic:", 'turnOnSuccess/' + deviceId)
        }
      })
    }, 1000)
  } else {
    var failedMessage = {
      deviceId: deviceId,
      time: Date.now(),
      status: OCCUPIED,
      message: "设备故障"
    }

    setTimeout(function () {
      client.publish('turnOnFailed/' + deviceId, JSON.stringify(failedMessage), function (error) {
        if(error) {
          console.log("publish turnOnFailed error:", error)
        } else {
          console.log("publish success, topic:", 'turnOnFailed/' + deviceId)
        }
      })
    }, 1000)
  }
}

client.on('message', function (topic, message, packet) {
  var topicLevel1 = topic.split('/')[0]

  switch (topicLevel1) {
    case 'turnOn':
      handleTurnOn(message)
      break
    default:
      console.log("未知消息 topic:", message.toString())
      break
  }

})

//设备下线
client.on('offline', function () {
  console.log("offline")
})

client.on('close', function () {
  console.log("close")
  process.exit()
})

client.on('reconnect', function () {
  console.log("reconnect")
})

client.on('error', function () {
  console.log("error")
})

//定时上报设备状态
setInterval(function () {
  var topic = 'deviceStatus/' + DEVICEID
  var statusMessage = {
    deviceId: DEVICEID,
    time: Date.now(),
    status: IDLE,
  }
  client.publish(topic, JSON.stringify(statusMessage), function (error) {
    if(error) {
      console.log("publish deviceStatus error:", error)
    } else {
      // console.log("publish success, topic:", topic)
    }
  })
}, 1000)

//10min后触发设备下线
setTimeout(function () {
  var offlineMessage = {
    deviceId: DEVICEID,
    time: Date.now(),
    message: '正常下线',
  }

  client.publish('offline', JSON.stringify(offlineMessage), function (error) {
    if(error) {
      console.log("publish offline error:", error)
    } else {
      console.log("publish offline success!")
      client.end()
    }
  })
}, 10 * 60 * 1000)


