import express from "express"
import http from 'http'
import {Server} from "socket.io"


const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer)

app.set("view engine", "ejs")

app.get("/",(req,res)=>{
    res.render("index")
})

io.on("connection",(socket)=>{
    console.log("User connected: ",socket.id)

    socket.on("chatMessage",(msg)=>{//.on used to listen for an event, in this case "chatMessage"
        io.emit("chatMessage",msg);//.emit used to send an event to all connected clients, in this case "chatMessage" with the message as data  
    })

    socket.on("disconnect", ()=>{
        console.log("user disconnected")
    })
})

httpServer.listen(3000,()=>{
    console.log(`Server running on PORT 3000`)
})
