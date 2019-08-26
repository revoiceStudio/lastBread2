require('json-dotenv')('config.json')
require('json-dotenv')('./controller/redisConfig.json')
require('dotenv').config({path:'credential.env'})
const express = require('express')
const request = require('request')
const router = require('./router')
const redis = require('redis');
const client = redis.createClient();
client.auth(process.env.redisOAuth)
const Redlock = require('redlock')
const redlock = new Redlock ([client], {
        driftFactor: 0.01, // the expected clock drift
        retryCount: 3,     // the max number of times Redlock will attempt
        retryDelay: 200,  // the time in ms between attempts
        retryJitter: 200   // the max time in ms randomly added to retries (to improve performance)
    }
);
const app = express()
app.use(express.json())

app.use('/lastbread', async function(req, res, next){    
    const jsonObj = req.body
    try{
        console.log(jsonObj.action["actionName"])
    }catch(err){
        console.log("액션이름 안 날라옴.")
    }
    

    // Nugu request
    if(jsonObj.context){     
        // If accessToken is undefined   
        if(!jsonObj.context.session["accessToken"]){
            console.log("OAuth is not linked")
            const responseObj = JSON.parse(process.env.RESPONSE)
            responseObj["resultCode"] = JSON.parse(process.env.EXCEPTION).OAuth
            return res.json(responseObj)
        }
        else{            
            req.user = await getGoogleUserInfo(jsonObj.context.session["accessToken"])
            console.log("ID : ",req.user.id,", NAME : "+ req.user.name)
        }
    }else{
        // Response to all other requests ( contain 'health' request )
        return res.json({'status':'OK'})
    }        
    
    req.cache = client
    req.redlock = redlock
    //req.expire =(60*60)*24*7
    req.expire = 60*60
    next()
})

app.use('/lastbread', router)

app.listen(process.env.PORT,() =>{
    console.log("port is "+ process.env.PORT)
})

function getGoogleUserInfo(accessToken){
    return new Promise( (resolve, reject)=>{
        const url = JSON.parse(process.env.URL).googleAPI
        const options = { 'url' : url+ accessToken }
        request(options, async (error, response, body) =>{
            if (error) throw error
            console.log("get Google UserInfo complete! ")
            resolve(JSON.parse(body))            
        })
    })    
}