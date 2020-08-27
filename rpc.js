/** 
-add progressbar for currently playing traack
-find out why position property returns 0
-fix time left with an extra loop to update it
*/
const discordClient = require("discord-rich-presence")("746625953957937183");
const dbus = require("dbus-native");
const sessionBus = dbus.sessionBus();
const fs = require('fs');
const museeksService = "org.mpris.MediaPlayer2.museeks";
const playerInterface = "org.mpris.MediaPlayer2.Player";
const objectPath = "/org/mpris/MediaPlayer2";
const propertyInterfaceName = "org.freedesktop.DBus.Properties";

const museeksImageKey = "museeks";
const playImageKey = "circle_play";
const pauseImageKey = "circle_pause";
const stopImageKey =  "circle_stop";

const museeksImageText = "Museeks";
const playImageText = "Playing";
const pauseImageText = "Paused";
const stopImageText = "stopped";

//Current track metadata
var currentStatus;
var currentTitle;
var currentAlbum;
var currentArtist;
var currentArtistFormatted = "";
var currentTrackLength;
var currentTrackLengthInSeconds;
var currentTrackLengthFormatted;
var currentDetailsFormatted;
var currentStateFormatted;

var currentSmallImageKey;
var currentSmallImageText;


var timeStarted = Math.floor(Date.now() / 1000);

if(!sessionBus){
    throw new Error("Can't find DBus");
}

let rawConfigData = fs.readFileSync("config.json");
let parsedConfig = JSON.parse(rawConfigData);
const checkForMuseeksRefreshTime = parsedConfig.config.checkForMuseeksRefreshTime;

//create a service object to interact with
const service = sessionBus.getService(museeksService);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
 }

 function formatDetailsFromJSON(){
    return "";
 }
 function formatStateFromJSON(){
    return "";
 }


checkForMuseeks();
var checkForMuseeksRefreshID = setInterval(checkForMuseeks,checkForMuseeksRefreshTime*1000);

function checkForMuseeks(){
    service.getInterface(objectPath, playerInterface, (error, interface) => {
        console.log("Checking for Museeks");
        if(error){
            console.error(`Failed to request interface "${playerInterface}" at "${objectPath}" : ${error}`
            ? error
            : "(no error)"); 
        }else{
            clearInterval(checkForMuseeksRefreshID);
            console.log("Connected to Museeks");
            startRPC(interface);
            service.getInterface(objectPath, propertyInterfaceName, (error, interface) => {
                if(error){
                    console.error(error);
                }
                try{
                    interface.on("PropertiesChanged", (msg, data) => {
                        // console.log("Property Changed");
                        startRPC();
                    });
                }catch(error){
                    console.error(error);
                }
                
                
                });
        }
    }); 
}



function startRPC(interface){
    service.getInterface(objectPath, propertyInterfaceName, (err, propertyInterface)=>{
        try {
            propertyInterface.Get(playerInterface, "PlaybackStatus", (err, output) => {
                var playbackStatus = output[1][0];
                switch(playbackStatus) {
                    case "Stopped":
                        currentStatus = "Stopped";
                        currentSmallImageKey = stopImageKey; 
                        break;
                    case "Paused":
                        currentStatus = "Paused";
                        currentSmallImageKey = pauseImageKey;
                        break;
                    case "Playing":
                        currentStatus = "Playing";
                        currentSmallImageKey = playImageKey;
                        break;
                    case undefined:
                        currentStatus = "Stopped";
                        currentSmallImageKey = stopImageKey;
                        break;
                    default:
                        currentStatus = "Stopped";
                        currentSmallImageKey = stopImageKey;
                }



                propertyInterface.Get(playerInterface, "Metadata", (err, metadata)=>{
                    if(err){
                        console.error(err);
                    }
                    if(metadata[1][0][2]==undefined){
                        //add option in config to show if no music is playing
                        currentTitle = "No Song Playing";
                        currentAlbum = "No Album";
                        currentArtist = "No Artist";
                        currentArtistFormatted = currentArtist;
                        currentTrackLength = 0;
                        currentTrackLengthFormatted = 0;
                    }else{
                        currentTitle = metadata[1][0][2][1][1][0];
                        currentAlbum = metadata[1][0][3][1][1][0];
                        currentArtist = metadata[1][0][4][1][1][0];

                        currentArtistFormatted = currentArtist.join();
                        currentDetailsFormatted = currentTitle + " on " + currentAlbum;
                        currentTrackLength = metadata[1][0][0][1][1][0];
                        currentTrackLengthInSeconds = Math.round(currentTrackLength/1000000);
                        currentTrackLengthFormatted = Math.round(currentTrackLengthInSeconds/60)+":"+(currentTrackLengthInSeconds%60).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
                    }


                    // propertyInterface.Get(playerInterface, "Position", (err, test) => {
                    //     console.log("Position "+test[1][0]);
                    //     // interface.Position((error, str) => {
                    //     //     console.log(str);
                    //     // });

                    // });


                    console.log(currentTitle + " by " +currentArtistFormatted +" is " + currentStatus);


                    // console.log(currentTitle);
                    // console.log(currentStatus);
                    // console.log(currentAlbum);
                    // console.log(currentArtist);
                    // console.log(currentTrackLengthInSeconds);
                    // console.log(currentArtistFormatted);

                    discordClient.updatePresence({
                        state: currentArtistFormatted,
                        details: currentDetailsFormatted,
                        largeImageKey: museeksImageKey,
                        largeImageText: museeksImageText,
                        smallImageKey: currentSmallImageKey,
                        smallImageText: currentStatus,
                        startTimestamp: timeStarted,
                        // endTimestamp: Date.now()+currentTrackLength/100,
                        instance: true
                    });
  

                });
                

            });
        }catch(error){
            console.error(error);
        }
    });
}


