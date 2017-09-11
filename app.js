var mqtt = require('mqtt')
const DEVICENO = 'yjb0001'

var env = process.argv[2];

//设备状态
const IDLE = 0  //空闲
const OCCUPIED = 1 //使用中

var MQTT_SERVER_URL = ""
const MQTT_SERVER_URL_DEV = 'mqtt://123.56.216.122:1883'
const MQTT_SERVER_URL_PRE = 'mqtt://139.196.84.116:1883'
const MQTT_SERVER_URL_PRO = ''

if(env === 'dev') {
  MQTT_SERVER_URL = MQTT_SERVER_URL_DEV
  console.log("mtqq dev")
} else if(env === 'pre') {
  MQTT_SERVER_URL = MQTT_SERVER_URL_PRE
  console.log("mtqq pre")
} else if(env === 'pro') {
  MQTT_SERVER_URL = MQTT_SERVER_URL_PRO
  console.log("mtqq pro")
}

const Device_Info = {
  deviceNo: DEVICENO,
  status: IDLE,
}

const CONN_OPTION = {
  clientId: DEVICENO,
  will: {
    topic: 'offline',
    payload: JSON.stringify({
      deviceNo: DEVICENO,
      time: Date.now(),
      message: '异常下线'
    })
  }
}

var client  = mqtt.connect(MQTT_SERVER_URL, CONN_OPTION)

//设备上线
client.on('connect', function (connack) {
  console.log(MQTT_SERVER_URL + " connected" )
  var onlineMessage = {
    deviceNo: DEVICENO,
    time: Date.now(),
  }
  client.publish('online', JSON.stringify(onlineMessage))
  Device_Info.status = IDLE   //设备状态-->空闲

  var topics = []
  topics.push('turnOn/' + DEVICENO)  //订阅开机消息

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
  var deviceNo = Message.deviceNo
  var socketId = Message.socketId
  var userId = Message.userId

  if(Device_Info.status === IDLE) {
    var successMessage = {
      socketId: socketId,
      deviceNo: deviceNo,
      userId: userId,
      time: Date.now(),
      status: OCCUPIED,
    }
    setTimeout(function () {
      client.publish('turnOnSuccess/' + deviceNo, JSON.stringify(successMessage), function (error) {
        if(error) {
          console.log("publish turnOnSuccess error:", error)
        } else {
          Device_Info.status = OCCUPIED //设备状态-->使用中
          console.log("publish success, topic:", 'turnOnSuccess/' + deviceNo)
        }
      })
    }, 1000)

    var finishMessage = {
      socketId: socketId,
      deviceNo: deviceNo,
      userId: userId,
      time: Date.now(),
      status: IDLE,
    }
    setTimeout(function () {  //10min后干衣结束
      client.publish('finish/' + deviceNo, JSON.stringify(finishMessage), function (error) {
        if(error) {
          console.log("publish finish error:", error)
          return
        }
        Device_Info.status = IDLE //设备状态-->空闲
        console.log("publish success, topic:", 'finish/' + deviceNo)
      })
    }, 1000 * 60 * 10)
  } else {
    var failedMessage = {
      deviceNo: deviceNo,
      time: Date.now(),
      status: OCCUPIED,
      message: "设备故障"
    }

    setTimeout(function () {
      client.publish('turnOnFailed/' + deviceNo, JSON.stringify(failedMessage), function (error) {
        if(error) {
          console.log("publish turnOnFailed error:", error)
        } else {
          console.log("publish success, topic:", 'turnOnFailed/' + deviceNo)
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
  var topic = 'deviceStatus/' + DEVICENO
  var statusMessage = {
    deviceNo: DEVICENO,
    time: Date.now(),
    status: Device_Info.status,
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
// setTimeout(function () {
//   var offlineMessage = {
//     deviceNo: DEVICENO,
//     time: Date.now(),
//     message: '正常下线',
//   }
//
//   client.publish('offline', JSON.stringify(offlineMessage), function (error) {
//     if(error) {
//       console.log("publish offline error:", error)
//     } else {
//       console.log("publish offline success!")
//       client.end()
//     }
//   })
// }, 10 * 60 * 1000)


