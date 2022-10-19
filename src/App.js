import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Video from "twilio-video";

import "./App.css"

const Chat = () => {
	const [roomName, setRoomName] = useState('');
	const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

	const [audioinput, setAudioInput] = useState([])
	const [videoinput, setVideoInput] = useState([])
	const [audiooutput, setAudioOutput] = useState([])

	const [mic, setMic] = useState(true)
	const ref2 = useRef()
	const ref3 = useRef()

	navigator.mediaDevices.getUserMedia({
		audio: true,
		video: true
	}).then(function (stream) {
		audioViz(stream)
	})

	function audioViz(stream) {

		var context = new AudioContext();
		var analyser = context.createAnalyser();
		var microphone = context.createMediaStreamSource(stream);

		var canvas = document.getElementById("canvas");
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		var ctx = canvas.getContext("2d");

		microphone.connect(analyser);
		analyser.connect(context.destination);

		analyser.fftSize = 256;

		var bufferLength = analyser.frequencyBinCount;
		console.log(bufferLength);

		var dataArray = new Uint8Array(bufferLength);

		var WIDTH = canvas.width;
		var HEIGHT = canvas.height;

		var barWidth = (WIDTH / bufferLength) * 2.5;
		var barHeight;
		var x = 0;

		function renderFrame() {

			requestAnimationFrame(renderFrame);

			x = 0;

			analyser.getByteFrequencyData(dataArray);

			ctx.fillStyle = "#000";
			ctx.fillRect(0, 0, WIDTH, HEIGHT);

			for (var i = 0; i < bufferLength; i++) {
				barHeight = dataArray[i];

				var r = barHeight + (25 * (i / bufferLength));
				var g = 250 * (i / bufferLength);
				var b = 50;

				ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
				ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

				x += barWidth + 1;
			}
		}

		renderFrame();
	}

	const joinChat = event => {
		event.preventDefault();
		if (roomName) {
			axios.post('http://localhost:5000/join-room', { roomName },).then((response) => {
				connectToRoom(response.data.token, mic, ref3.current.value, ref2.current.value);
				console.log(response.data)
				setHasJoinedRoom(true);
				setRoomName('');

			}).catch((error) => {
				console.log(error);
			})
		} else {
			alert("You need to enter a room name")
		}
	};

	useEffect(() => {

		let audioInput = []
		let videoInput = []
		let audiOutput = []

		navigator.mediaDevices.enumerateDevices().then(devices => {
			devices.forEach(device => {
				if (device.kind === "audioinput") {
					audioInput.push({ device_name: device.label, device_id: device.deviceId })
				}
				if (device.kind === "videoinput") {
					videoInput.push({ device_name: device.label, device_id: device.deviceId })
				}
				if (device.kind === "audiooutput") {
					audiOutput.push({ device_name: device.label, device_id: device.deviceId })
				}
			})

			setAudioInput([...audioInput])
			setVideoInput([...videoInput])
			setAudioOutput([...audiOutput])

		})
	}, [])

	const connectToRoom = (token, audioinputvalue, audiooutputvalue, videoinputvalue) => {

		const { connect, createLocalVideoTrack, createLocalTracks } = Video;

		createLocalTracks({ audio: { deviceId: mic }, video: { deviceId: videoinputvalue } }).then(local_tracks => {

			let connectOption = { name: roomName, tracks: local_tracks };

			connect(token, connectOption).then(room => {

				console.log(`Successfully joined a Room: ${room}`);

				const videoChatWindow = document.getElementById('video-chat-window');

				createLocalVideoTrack().then(track => {
					videoChatWindow.appendChild(track.attach());
				});

				room.on('trackSubscribed', track => {

					console.log(audioinputvalue, audiooutputvalue, videoinputvalue)


					if (track.kind === 'audio') {
						const audioElement = track.attach();
						audioElement.setSinkId(audiooutputvalue).then(() => {
							document.body.appendChild(audioElement);
						});
					}
				});

				room.on('participantConnected', participant => {

					console.log(`Participant "${participant.identity}" connected`);

					participant.tracks.forEach(publication => {
						if (publication.isSubscribed) {
							const track = publication.track;
							videoChatWindow.appendChild(track.attach());
						}
					});

					participant.on('trackSubscribed', track => {
						videoChatWindow.appendChild(track.attach());
					});


				});
			}, error => {
				console.error(`Unable to connect to Room: ${error.message}`);
			});
		})

	};


	return (
		<div className="container">
			<div className={"col-md-12"}>
				<h1 className="text-title">Node React Video Chat</h1>
			</div>
			<div className="col-md-6">
				<div className={"mb-5 mt-5"}>
					{!hasJoinedRoom && (
						<form className="form-inline" onSubmit={joinChat}>
							<input type="text" name={'roomName'} className={"form-control"} id="roomName"
								placeholder="Enter a room name" value={roomName} onChange={event => setRoomName(event.target.value)} />

							<button type="submit" className="btn btn-primary">Join Room</button>

							<select name="audioinput" id="" onChange={(dd) => { setMic(dd.target.value) }}>
								{
									audioinput.map((ele, index) => {
										return <option key={index} value={ele.device_id}>{ele.device_name}</option>
									})
								}
							</select>
							<select name="videoinput" id="" ref={ref2}>
								{
									videoinput.map((ele, index) => {
										return <option key={index} value={ele.device_id}>{ele.device_name}</option>
									})
								}
							</select>
							<select name="audiooutput" id="" ref={ref3}>
								{
									audiooutput.map((ele, index) => {
										return <option key={index} value={ele.device_id}>{ele.device_name}</option>
									})
								}
							</select>

							<canvas id="canvas"></canvas>

						</form>

					)}
				</div>
				<div id="video-chat-window"></div>
			</div>
		</div>
	)
};

export default Chat;
