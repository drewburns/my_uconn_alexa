// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
var http = require('http');
const cheerio = require('cheerio');

function capitalize(s)
{
    return s[0].toUpperCase() + s.slice(1);
}

var getMenuRequest = function(location, time, callback) {

  const location_dict = {"buckley": "03" , "towers": "42", "mcmahon": "05", "north": "07", "northwest": "15", "putnam": "06","south":"16","whitney": "01"};
    const userLocation = location_dict[location];
    const userTime = capitalize(time);
    const url = `http://nutritionanalysis.dds.uconn.edu/longmenu.aspx?&locationNum=${userLocation}&mealName=${userTime}`;

  var req = http.get(url, (res) => {
    var body = "";

    res.on("data", (chunk) => {
      body += chunk;
    });

    res.on("end", () => {
      console.log(body);

      callback(body);
      //callback('test');
    });
  }).on("error", (error) => {
    //callback(err);
    console.log('error');
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
const getMenuResponse = (location,time, handlerInput, responseBuilder) => {
    getMenuRequest(location,time, function(body, error) {
        if (error) {
            const speakString = 'An error occurred';
            return handlerInput.responseBuilder.speak(speakString).withShouldEndSession(false).getResponse();
        } else {
            const speakString = getMenuString(location,time,body);
            return handlerInput.responseBuilder.speak(speakString).withShouldEndSession(false).getResponse();
        }
    });
    // const htmlResponse = xmlHttp.responseText;
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
    handle(handlerInput) {
        const speakOutput = 'The menu!';
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const location = intent["slots"]["location"]["value"];
        const meal_time = intent["slots"]["time"]["value"];
        if (meal_time && location) {
            const menuResponse = getMenuResponse(location,meal_time);
            console.log(menuResponse);
            getMenuResponse(location, meal_time, handlerInput, responseBuilder);
        } else {
            return handlerInput.responseBuilder.withShouldEndSession(false).addDelegateDirective(intent).getResponse();
        }
    }
};
const BusIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'The bus!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
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
