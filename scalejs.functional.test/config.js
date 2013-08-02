var require = {
    "baseUrl":  ".",
    "paths":  {
        "es5-shim":  "Scripts/es5-shim",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "json2":  "Scripts/json2",
        "scalejs":  "Scripts/scalejs-0.2.7.28",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9.5"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.functional"
        ]
    },
    "shim":  {
        "jasmine":  {
            "exports":  "jasmine"
        },
        "jasmine-html":  {
            "deps":  [
                "jasmine"
            ]
        }
    }
};
