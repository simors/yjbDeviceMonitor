var mqtt = require('mqtt')
const DEVICEID = 'yjb0001'

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


//设备状态
const IDLE = 0  //空闲
const OCCUPIED = 1 //使用中

//设备上线
client.on('connect', function (connack) {
  console.log("connected" )
  var onlineMessage = {
    deviceId: DEVICEID,
    time: Date.now(),
  }
  client.publish('online', JSON.stringify(onlineMessage))

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
      console.log("publish success, topic:", topic)
    }
  })
}, 1000)

//10s后触发设备下线
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
}, 10000)



