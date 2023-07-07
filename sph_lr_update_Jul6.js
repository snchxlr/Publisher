/**
 * @file sph_liveramp.js
 *
 * Common helper functions used to return an Identity Envelope From a First-Party Cookie
 * Implements a mock function and exposes where we are resolving users to envelopes.
 */
(function ($, Drupal, drupalSettings) {

    Drupal.behaviors.sph_liveramp = {
        attach: function (context, settings) {
            $(document).ready(async function(){
                window['ats'] = {};
                window.ats.retrieveEnvelope = retrieveEnvelope;

                if (getCookie('_lr_env') === null){
                    if(getCookie('mysph_lr') !== null && getCookie('mySPHUserType') !== 'y-anoy') {
                        console.log('fetching mysph lr')
                        await fetchEnvelope();
                    } else {
                        console.log('LR anon');
                    }
                } else {
                    if (getCookie('_lr_exp') <= Date.now()) {
                        console.log('lr expired');
                        if(getCookie('mySPHUserType') === 'y-anoy') {
                            console.log('refreshing anon lr')
                            await refreshEnvelope();
                        } else {
                            console.log('fetching env lr')
                            await fetchEnvelope();
                        }
                    } else {
                        console.log('lr not expired. Skipping');
                    }
                }

            });
        },
    }
    function retrieveEnvelope(callback) {
        let env = undefined;

        if(getCookie('_lr_env') === null) {
            console.info('Empty LR Envelope')
            return null;
        }
        try {    //updated env variable
            env =
                decodeURIComponent(document.cookie.match('(^|;) *_lr_env=([^;]*)')[2]);

              env =  JSON.parse(atob(env))
              env = JSON.stringify(env);

        } catch (e) {
            if (e.name === 'SyntaxError' || e.name === 'DOMException'){
                console.error('SyntaxError: Malformed envelope')
            } else {
                console.error(e);
            }
        } finally {
            if (callback) {
                callback(env);
            } else {
                return env;
            }
        }
    }

     async function fetchEnvelope(){
        let iv, fetchUrl;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Origin: drupalSettings.sph_liveramp.origin
            }
        };
        try {
            iv = atob(decodeURIComponent(getCookie('mysph_lr')));
            fetchUrl = `https://api.rlcdn.com/api/identity/v2/envelope?pid=${drupalSettings.sph_liveramp.pid}&it=4&iv=${iv}`; //using a newer api endpoint to fetch envelope
        } catch (e) {
            if (e.name === 'SyntaxError' || e.name === 'DOMException'){
                console.error('SyntaxError: Malformed envelope')
                return;
            } else {
                console.error(e);
                return;
            }
        }

        console.log('triggering fetch');
        fetch(fetchUrl, options)
            .then(response => response.json())
            .then(
                (response) => {
                    console.log('fetch successful');
                    console.log(response)
                    //setCookie('_lr_env', btoa(JSON.stringify(response.envelopes[0].value)), 1);  your original setCookie, we have updated it in the lines below
                    let env ={
                        "envelope": response.envelopes[0].value  //retrieving envelope response from an object to a key called envelope
              }
                    setCookie('_lr_env', btoa(JSON.stringify(env),1)) //newsetCookie code to retrieve String from Object
                    setCookie('_lr_exp', Date.now() + (3600 * 1000 * 24), 1);
                }
            ).catch(
            err => console.error(err)
        );
    }

    async function refreshEnvelope(){
        let iv, refreshUrl;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Origin: drupalSettings.sph_liveramp.origin
            }
        };
        try {
            iv = JSON.parse(atob(decodeURIComponent(getCookie('_lr_env')))).envelope;
            refreshUrl = `https://api.rlcdn.com/api/identity/v2/envelope/refresh?pid=${drupalSettings.sph_liveramp.pid}&it=19&iv=${iv}`; //using a newer api endpoint to refresh envelope
        } catch (e) {
            if (e.name === 'SyntaxError' || e.name === 'DOMException'){
                console.error('SyntaxError: Malformed envelope')
                return;
            } else {
                console.error(e);
                return;
            }
        }

        console.log('triggering refresh');
        fetch(refreshUrl, options)
            .then(response => response.json())
            .then(
                (response) => {
                    let date = new Date();
                    let env ={
                        "envelope": response.envelopes[0].value //retrieving envelope response from an object to a key called envelope
              }
                    setCookie('_lr_env', btoa(JSON.stringify(env),1)) //newsetCookie code to retrieve String from Object
                    setCookie('_lr_exp', Date.now() + (3600 * 1000 * 24), 1);
                    //setCookie('_lr_env', btoa(JSON.stringify(response)), 1); // encode response object
                    //setCookie('_lr_exp', Date.now() + (3600 * 1000 * 24), 1); // 24 hour expiry
                }
            ).catch(
            err => console.error(err)
        );
    }

    function getCookie(name) {
        let match = document.cookie.match(RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
        return match ? match[1] : null;
    }

    function setCookie(name,value,days) {
        var expires;
        if (days) {
            let date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            expires = "; expires="+date.toGMTString();
        }
        else expires = "";
        document.cookie = name+"="+value+expires+"; path=/";
    }

})(jQuery, Drupal, drupalSettings);
