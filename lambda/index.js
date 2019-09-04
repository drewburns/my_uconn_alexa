// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
var http = require('http');
var https = require('https');
const cheerio = require('cheerio');

function capitalize(s)
{
    return s[0].toUpperCase() + s.slice(1);
}

var getMenuRequest = async function(location, time) {
    console.log('start');
  const location_dict = {"buckley": "03" , "towers": "42", "mcmahon": "05", "north": "07", "northwest": "15", "putnam": "06","south":"16","whitney": "01"};
    const userLocation = location_dict[location];
    const userTime = capitalize(time);
    const url = `http://nutritionanalysis.dds.uconn.edu/longmenu.aspx?&locationNum=${userLocation}&mealName=${userTime}`;
    return new Promise((resolve, reject) => {
        var req = http.get(url, (res) => {
        var body = "";

        res.on("data", (chunk) => {
            body += chunk;
        });

        res.on("end", () => {
            console.log('end');
            console.log(body);
            resolve(body);
            //callback('test');
        });
        }).on("error", (error) => {
            console.log('error');
            console.log(error);
            //callback(err);
            reject(error);
        });
    });
};

var getBusRequest = async function(stop) {
  console.log('start bus');
    const url = `https://huskygo.transloc.com/t/stops/${stop}`;
    console.log(url);
    return new Promise((resolve, reject) => {
        var req = https.get(url, (res) => {
        var body = "";

        res.on("data", (chunk) => {
            body += chunk;
        });

        res.on("end", () => {
            resolve(body);
            //callback('test');
        });
        }).on("error", (error) => {
            //callback(err);
            reject(error);
        });
    });
};
const getMenuString = (location,time,body) => {
    const $ = cheerio.load(body);
    const itemArray = [];
    const itemHtml = $('.longmenucoldispname');
    if (itemHtml.length === 0) {
        return `There is nothing for ${time} at ${location}`;
    }
    const menuItems = itemHtml.map(function(i, el) {
      itemArray.push($(this).text());
    });
    // const menuString = ""
    // menuItems.map(i => menuString += i.text());
    const menuString = itemArray.slice(0, itemArray.length - 1).join(', ') + ', and ' + itemArray.slice(itemArray.length - 1, itemArray.length);
    return `For ${time} at ${location}, there is ${menuString}`;
};
const getMenuResponse = async (location,time) => {
    
    const htmlResponse = await getMenuRequest(location,time);
    const speakString = getMenuString(location,time,htmlResponse);
    return speakString;
};
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to Uconn Menu and Bus Tracker';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const MenuIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'menu';
    },
    async handle(handlerInput) {
        const speakOutput = 'The menu!';
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const location = intent["slots"]["location"]["value"];
        const meal_time = intent["slots"]["time"]["value"];
        if (meal_time && location) {
            try {
                let responseString = await getMenuResponse(location, meal_time);
                return handlerInput.responseBuilder.speak(Alexa.escapeXmlCharacters(responseString)).withShouldEndSession(false).getResponse();
            }catch(error) {
                console.log(error);
                return handlerInput.responseBuilder.speak("Error occurred").withShouldEndSession(false).getResponse();
            }
        } else {
            return handlerInput.responseBuilder.withShouldEndSession(false).addDelegateDirective(intent).getResponse();
        }
    }
};

const getBusResponse = async (bus_name, bus_id, location_name, location_id) => {
    const htmlResponse = await getBusRequest(location_id);
    const $ = cheerio.load(htmlResponse);
    const busTime = $(`a[href="/t/routes/${bus_id}"]`);
    console.log(`a[href="/t/routes/${bus_id}"]`);
    console.log('bus time search', busTime);
    const waitTimes = $(busTime[2]).text();
    let times = waitTimes;
    times = times.replace("<", "less than ");
    times = times.replace("&", "minutes and");
    times = times.replace("mins", "minutes");
    console.log(times);
    
    if (times === '') {
        return `This bus is either not running or does not stop at that location.`
    }
    if (times.includes('--')) {
        return `Time not available at this moment.`
    }
    // const speakString = getMenuString(location,time,htmlResponse);
    return `The ${bus_name} line is coming to ${location_name} in ${times}`;
};
const BusIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'bus';
    },
    async handle(handlerInput) {
        const speakOutput = 'The bus!';
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        // ["resolutions"]["resolutionsPerAuthority"]["values"][0]["value"]["id"]
        const bus_id = intent['slots']['bus_line']["resolutions"]["resolutionsPerAuthority"][0]["values"][0]["value"]["id"];
        const bus_name = intent['slots']['bus_line']['value'];
        const bus_location_id = intent['slots']['bus_location']["resolutions"]["resolutionsPerAuthority"][0]["values"][0]["value"]["id"];
        const bus_location_name = intent['slots']['bus_location']['value'];
        if (bus_location_name && bus_name) {
            try {
                let responseString = await getBusResponse(bus_name, bus_id, bus_location_name, bus_location_id);
                // console.log(responseString)
                return handlerInput.responseBuilder.speak(Alexa.escapeXmlCharacters(responseString)).withShouldEndSession(false).getResponse();
            }catch(error) {
                console.log(error);
                return handlerInput.responseBuilder.speak("Error occurred").withShouldEndSession(false).getResponse();
            }
        } else {
            return handlerInput.responseBuilder.withShouldEndSession(false).addDelegateDirective(intent).getResponse();
        }
        // return handlerInput.responseBuilder
        //     .speak(speakOutput)
        //     //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        //     .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can ask me questions about the bus or the menu.For example, you can ask whats for lunch at north. Or you can ask when is the blue line coming to busby.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        MenuIntentHandler,
        BusIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();
