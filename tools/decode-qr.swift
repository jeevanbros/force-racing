import Foundation
import Vision
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNDetectBarcodesRequest()
request.symbologies = [.qr]
let handler = VNImageRequestHandler(url: url)
try handler.perform([request])
for result in request.results ?? [] { print(result.payloadStringValue ?? "No payload") }
