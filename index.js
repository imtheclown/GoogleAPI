const axios = require('axios');
// express essentials
const express = require("express")
const app = express();
const port = 5000;
// API essentials
// personal APIKey
const APIKey = `AIzaSyAwn13ThmiYHeKpMG63f24oiVVsGjP_oWc`;
// API endpoint for getting address components
const idURL = `https://maps.googleapis.com/maps/api/place/details/json`
    // API endpoint for getting the latitude and longitude
const locationURL = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`;
// API endpoint for getting autocomplete suggestions
const suggestionURL = `https://maps.googleapis.com/maps/api/place/autocomplete/json`


app.get('/my-api', async(request, res) => {
    // router parameters
    const { barangay, municipality, province, searchText } = request.query
    const data = {
            "barangay": barangay,
            "municipality": municipality,
            "province": province,
            "searchText": searchText
        }
        // address given by url parameter
    const address = `${barangay}, ${municipality}, ${province}`.replaceAll(",", "%2C")
        // retrieves the longitude and latitude
    const location = await getGeometry(address).then(APIresponse => {
            if (APIresponse.data && APIresponse.data["candidates"]) {
                if (APIresponse.data["candidates"][0] && APIresponse.data["candidates"][0]["geometry"]) {
                    // longitude and latitude
                    const location = APIresponse.data["candidates"][0]["geometry"]["location"]
                    return location
                }
            }
        }).catch(error => {
            console.log(error.message)
            return undefined

        })
        // checks if location is not undefined
    if (location) {
        // retrieves autocomplete suggestions
        const suggestions = await getSuggestions(data, location).then(response => {
                if (response.data && response.data["predictions"]) {
                    let predictionArray = []
                        // list of autocomplete suggestions
                    const predictions = response.data["predictions"]
                        // loops throught the array of responses
                    for (key in predictions) {
                        // if length of array is already 5 break since we only need 5 at most
                        if (predictionArray.length == 5) {
                            break
                        } else {
                            // push the current preduction to the prediction array
                            predictionArray.push(predictions[key])
                        }
                    }
                    // retrieves at most 5 suggestions
                    return predictionArray
                }
            }).catch(error => {
                console.log(error)
                return undefined
            })
            // checks if suggestion is not undefined
        if (suggestions) {
            // array of formatted suggestions
            const objectArray = []
                // loops through the retrieved suggestions
            for (key in suggestions) {
                // description is the formatted address
                const description = suggestions[key]["description"]
                    // retrieves the place's place_id
                    // place_id is necesssary for getting the address_components
                const place_id = await getGeometry(description).then(response => {
                        return response.data["candidates"][0]["place_id"]
                    }).catch(error => {
                        console.log(error)
                        return undefined
                    })
                    // checks if place_id is not undefined
                if (place_id) {
                    // gets address components for the current address
                    const address_components = await getAddressComponents(place_id).then(response => {
                            return response["result"]["address_components"]
                        }).catch(error => {
                            console.log(error)
                            return undefined
                        })
                        // checks if address components is not undefined
                    if (address_components) {
                        // format for the address
                        let address_breakdown = {
                                "adddress": description,
                                "barangay": undefined,
                                "municipality": undefined,
                                "province": undefined
                            }
                            // determines the value of barangay, municipality and provice
                            // based on the types specified by the address components
                            // route = barangay, locality = municipality and administrative_area_level_2 = province
                        for (key in address_components) {
                            const element = address_components[key]
                            if (element["types"].includes("route")) {
                                address_breakdown["barangay"] = element["long_name"]
                            } else if (element["types"].includes("locality")) {
                                address_breakdown["municipality"] = element["long_name"]
                            } else if (element["types"].includes("administrative_area_level_2")) {
                                address_breakdown["province"] = element["long_name"]
                            }
                        }
                        // pushes the object to the objectArray
                        objectArray.push(address_breakdown)
                    } else {
                        console.log(`Failed to retrieve address components for ${description}`)
                    }
                } else {
                    console.log(`Failed to retrieve place_id for ${description}`)
                }
            }
            // send the autocomplete suggestions to the browser
            res.send(objectArray)
        } else {
            console.log(`Autocomplete suggestions retrieval failed`)
            res.send(`FAILED to retrieve autocomplete suggestions`)
        }

    } else {
        console.log(`Longitude and Latitude retrieval failed`)
        res.send("FAILED to retrieve latitude and longitude")
    }

})

function getGeometry(address) {
    console.log("Getting latitude and longitude")
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: `${locationURL}?input=${address}&inputtype=textquery&fields=place_id,rating,formatted_address,geometry&key=${APIKey}`.replaceAll("0", "%20").replaceAll(",", "%2C")
        }).then(APIresponse => {
            console.log("latitude and longitude successfully retrieved")
            resolve(APIresponse)
        }).catch(error => {
            console.log("Failed to retrieve latitude and longitude")
            reject(error)
        })
    })
}

function getAddressComponents(id) {
    console.log("Retrieving address components")
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: `${idURL}?place_id=${id}&fields=address_components&key=${APIKey}`
        }).then(APIresponse => {
            console.log(`successfully retrieved address components for place with place_id:${id}`)
            resolve(APIresponse.data)
        }).catch(error => {
            console.log(`Failed to retrieve address components for place with id:${id}`)
            reject(error)
        })
    })
}

function getSuggestions(data, location) {
    const { searchText } = data
    console.log(`Retrieving suggestions for input:${searchText}`)
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: `${suggestionURL}?input=${searchText}&location=${location.lat},${location.lng}&radius=10000&strictbounds=true&key=AIzaSyAwn13ThmiYHeKpMG63f24oiVVsGjP_oWc`.replaceAll(",", "%2C")
        }).then(response => {
            console.log(`Suggestions for input ${searchText} successfully retrieved`)
            resolve(response)
        }).catch(error => {
            console.log(`Failed to retrieve suggestions for ${searchText}`)
            reject(error)
        })
    })
}
app.listen(port, () => {
    console.log("Listening to port 5000")
})