import UIKit
import Capacitor
import AppTrackingTransparency

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Mit Szenen (SceneDelegate) ruft iOS das hier NICHT auf – der eigentliche
        // Ausloeser ist sceneDidBecomeActive im SceneDelegate. Bleibt als Rueckfall.
        planeTrackingAbfrage()
    }

    // MARK: - App Tracking Transparency
    //
    //  Die Tracking-Abfrage kommt NATIV und beim Start, nicht ueber das AdMob-Plugin:
    //  Das Plugin ruft ATTrackingManager auf Capacitors Hintergrund-Warteschlange auf,
    //  und dort erscheint der Dialog nicht. Apple hat die Mahjong-App deshalb mehrfach
    //  nach Richtlinie 2.1 abgelehnt („unable to locate the App Tracking Transparency
    //  permission request“). Gefragt wird eine Sekunde nach didBecomeActive (frueher
    //  verwirft iOS die Anfrage gern stillschweigend), mit bis zu drei Versuchen.
    //  js/ads.js wartet auf die Antwort, bevor AdMob startet.
    //  ⚠ Die App laeuft mit UIScene: Ausgeloest wird aus SceneDelegate.sceneDidBecomeActive.
    //  Build 24 (1.2.0) hing nur an applicationDidBecomeActive, das mit Szenen nie kommt –
    //  Apple fand den Dialog deshalb nicht (Ablehnung 2.1 am 21.10.2026).
    private var abfrageGeplant = false
    private var abfrageLaeuft = false
    private var versuche = 0

    func planeTrackingAbfrage() {
        guard !abfrageGeplant, versuche < 3 else { return }
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
        abfrageGeplant = true
        versuche += 1
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self = self else { return }
            guard UIApplication.shared.applicationState == .active else {
                // Inzwischen im Hintergrund: beim naechsten Aktivwerden neu planen.
                self.abfrageGeplant = false
                return
            }
            self.frageNachTracking()
        }
    }

    private func frageNachTracking() {
        guard !abfrageLaeuft, ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
        abfrageLaeuft = true
        ATTrackingManager.requestTrackingAuthorization { [weak self] status in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.abfrageLaeuft = false
                // Kein Dialog erschienen (iOS hat die Anfrage verworfen): erneut versuchen.
                guard status == .notDetermined else { return }
                self.abfrageGeplant = false
                self.planeTrackingAbfrage()
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
