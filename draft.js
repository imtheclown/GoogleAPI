const axios = require('axios');
// express essentials
const express = require("express")
const app = express();
const port = 5000;
// API essentials
const APIKey = `AIzaSyAwn13ThmiYHeKpMG63f24oiVVsGjP_oWc`;
const idURL = `https://maps.googleapis.com/maps/api/place/details/json`
const locationURL = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`;
const suggestionURL = `https://maps.googleapis.com/maps/api/place/autocomplete/json`


app.get('/my-api', async(request, res) => {
    const { barangay, municipality, province, searchText } = request.query
    const data = {
        "barangay": barangay,
        "municipality": municipality,
        "province": province,
        "searchText": searchText
    }
    const address = `${barangay}, ${municipality}, ${province}`.replaceAll(",", "%2C")
    await getGeometry(address).then(APIresponse => {
        if (APIresponse.data && APIresponse.data["candidates"]) {
            if (APIresponse.data["candidates"][0] && APIresponse.data["candidates"][0]["geometry"]) {
                // longitude and latitude
                const location = APIresponse.data["candidates"][0]["geometry"]["location"]
                const suggestions = getSuggestions(data, location).then(newResponse => {
                    if (newResponse.data && newResponse.data["predictions"]) {
                        let predictionArray = []
                        const predictions = newResponse.data["predictions"]
                        for (key in predictions) {
                            if (predictionArray.length == 5) {
                                break
                            } else {
                                predictionArray.push(predictions[key])
                            }
                        }
                        // retrieves at most 5 suggestions
                        return predictionArray
                    }
                }).catch(error => {
                    console.log(error)
                })
                suggestions.then(response => {
                    // response is an array
                    const objectArray = []
                    for (key in response) {
                        const description = response[key]["description"]
                        getGeometry(description).then(addressResponse => {
                            const place_id = (addressResponse.data["candidates"][0]["place_id"])
                            console.log(typeof place_id)
                            console.log(place_id)
                            getAddressComponents(place_id).then(addressResponse => {
                                const address_components = addressResponse["result"]["address_components"]
                                const address_breakdown = {
                                    "full_address": description,
                                }
                                address_components.forEach(element => {
                                    if (element["types"].includes("sublocality_level_1")) {
                                        address_breakdown["barangay"] = element["long_name"]
                                    } else if (element["types"].includes("sublocality")) {
                                        address_breakdown["barangay"] = element["long_name"]
                                    } else if (element["types"].includes("locality")) {
                                        address_breakdown["municipality"] = address_breakdown["long_name"]
                                    } else if (element["types"].includes("administrative_area_level_2")) {
                                        address_breakdown["province"] = element["long_name"]
                                    }
                                });
                                objectArray.push(address_breakdown)
                            })
                        })

                    }

                    res.send(JSON.stringify(response))
                })
            }
        }
    })

})

function getGeometry(address) {
    // should be an address already
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: `${locationURL}?input=${address}&inputtype=textquery&fields=place_id,rating,formatted_address,geometry&key=${APIKey}`.replaceAll("0", "%20").replaceAll(",", "%2C")
        }).then(APIresponse => {
            console.log("Getting latitude and longitude")
            resolve(APIresponse)
        }).catch(error => {
            reject(error)
        })
    })
}

function getAddressComponents(id) {
    console.log(id)
    return new Promise((resolve, reject) => {

        axios({
            method: "GET",
            url: `${idURL}?place_id=${id}&fields=address_components&key=${APIKey}`
        }).then(APIresponse => {
            resolve(APIresponse.data)
        }).catch(error => {
            reject(error)
        })
    })
}

function getSuggestions(data, location) {
    const { searchText } = data
    console.log(location)
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: `${suggestionURL}?input=${searchText}&location=${location.lat},${location.lng}&radius=10000&strictbounds=true&key=AIzaSyAwn13ThmiYHeKpMG63f24oiVVsGjP_oWc`.replaceAll(",", "%2C")
        }).then(response => {
            console.log("Getting suggestions")
            resolve(response)
        }).catch(error => {
            reject(error)
        })
    })
}
app.listen(port, () => {
    console.log("Listening to port 5000")
})