const http = require('http')
const https = require('https')
const Bot = require('messenger-bot')
const _ = require('lodash')
const fs = require('fs')


//set up the scripts
const scriptFolder = './scripts/'

console.log("finding scripts")
let scripts = fs.readdirSync(scriptFolder)
console.log(scripts.length, " scripts found")


let bot = new Bot({
  token: process.env.PAGE_TOKEN,
  verify: process.env.VERIFY_TOKEN,
  app_secret: process.env.APP_SECRET
})

var user_mp_emails = {}
var user_mp_names = {}

bot.on('error', (err) => {
  console.log(err.message)
})



bot.on('message', (payload, reply) => {
  let text = payload.message.text
  let attachments = payload.message.attachments

  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err

      console.log(`MESSAGE RECIEVED: ` + JSON.stringify(payload))

    let location = undefined;

    if (attachments) {
      for (var i = attachments.length - 1; i >= 0; i--) {
        if (attachments[i].type == "location") {
          location = attachments[i].payload.coordinates
          console.log(JSON.stringify(attachments[i]))
        }
      }
    }

    if (location) {
      console.log("GOT COORDS" + JSON.stringify(location))
      
      let url = "https://represent.opennorth.ca/representatives/house-of-commons/?point="+location.lat+","+location.long

      https.get(url, (resp) => {
        let data = ''

        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
          data += chunk
        })

        // The whole response has been received. Print out the result.
        resp.on('end', () => {


          parsed = JSON.parse(data)

          console.log("ID: ", payload.sender.id)

          let id = payload.sender.id

          console.log("OBJECT", parsed.objects[0])

          user_mp_emails[id] = parsed.objects[0].email
          user_mp_names[id] = parsed.objects[0].name

          console.log("inside response", user_mp_names[payload.sender.id], user_mp_emails[payload.sender.id])

          issueButtons = []

          for (var i = scripts.length - 1; i >= 0; i--) {
            issueButtons.push(
            {
              content_type:"text",
              title:scripts[i],
              payload:scripts[i]
            }
            )
          }


          reply({ text: "Pick the issue you want to talk about", quick_replies: issueButtons }, (err) => {
            if (err) throw err

          })



        })
      })
    }


    else if (payload.message.quick_reply && payload.message.quick_reply.payload) {
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (payload.message.quick_reply.payload === scripts[i]) {
          let letterText = fs.readFileSync(scriptFolder + scripts[i], 'utf-8')

          letterText = letterText.replace("$NAME", profile.first_name + " " + profile.last_name)

          let yesNoButtons = [
            {
              content_type: "text",
              title: "Yes",
              payload: "SENDNOW" + scripts[i]
            },
            {
              content_type: "text",
              title: "No. Reset",
              payload: "RESET"
            }
          ];

          reply({ text: "Here is your letter. Do you want to send it?" + letterText, quick_replies: yesNoButtons }, (err) => {
              if (err) throw err

            })

        }
      }

      for (var i = scripts.length - 1; i >= 0; i--) {
        if ( payload.message.quick_reply.payload === "SENDNOW" + scripts[i]) {
            reply({ text: "(NOT REALLY)Sent to " + user_mp_names[payload.sender.id] }, (err) => {
                if (err) throw err

              })
        }
      }
    }


    else {

      reply({ text: "I need your location", quick_replies: [ { content_type: "location" } ] }, (err) => {
        if (err) throw err

      })

    }
  })
})

let port = process.env.PORT || 3000

http.createServer(bot.middleware()).listen(port)
console.log('Bot server running at port ', port)
