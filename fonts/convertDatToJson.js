(function() {
var fs = require('fs');

class DatToJsonFontConverter{
    constructor(rawInput) {
        this.line = rawInput.split(/\r?\n/);
        this.out = {};
        this.pos = 0;
        this.charIdx = 0;
        this.height = this.readHeight();
        this.pixelSign = "0";
        this.charMap =  {
            165: "Ą", 198: "Ć", 202: "Ę", 163: "Ł", 209: "Ń", 211: "Ó", 140: "Ś",
            143: "Ź", 175: "Ż", 185: "ą", 230: "ć", 234: "ę", 179: "ł", 241: "ń",
            243: "ó", 156: "ś", 159: "ź", 191: "ż"
        };
    }

    readHeight() {
        var i = 1;
        var width = parseInt(this.line[0]);
        while(i < this.line.length && this.line[i].length == width) {
            i++;
        }
        return i - 1;
    }

    readChar() {
        if (this.charIdx > 127) {
            if (!this.charMap[this.charIdx]) {
                this.charIdx++;
                this.pos += 1 + this.height + 1;
                return;
            }
        }
        var width = parseInt(this.line[this.pos]);
        this.pos++;
        var charPixMap = Array(width).fill(0).map(i => Array(this.height).fill(false));
        var shouldAdd = false;
        for (var y=0; y<this.height; y++) {
            if(this.line[this.pos + y].length != width) {
                throw "Broken file. Line: " + (this.pos + y + 1);
            }
            for (var x=0; x<width; x++) {
                if (this.line[this.pos + y][x] == this.pixelSign) {
                    charPixMap[x][y] = true;
                    shouldAdd = true;
                }
            }
        }
        this.pos += this.height;
        if (this.line[this.pos].length > 0 ) {
            throw "No empty new line after char. Line: " + (this.pos + 1);
        }
        if (this.charIdx == 0x0A || this.charIdx == 0x20) {
            shouldAdd = true;
        }
        this.pos++;
        if (shouldAdd) {
            if (this.charIdx < 128) {
                let char = String.fromCharCode(this.charIdx);
                this.out[char] = charPixMap;
            } else {
                if (this.charMap[this.charIdx]) {
                    let char = this.charMap[this.charIdx];
                    this.out[char] = charPixMap;
                }
            }
        }
        this.charIdx++;
    }

    convert() {
        for(var i=0;i<256;i++) {
            this.readChar();
        }
        return this.out;
    }

}

function createFontJsonFromFile(fileIn) {
    var datFile = fs.readFileSync(fileIn, 'utf8');
    var converter = new DatToJsonFontConverter(datFile);
    return converter.convert();
}

var fonts = {
    "Piwo 10px" : createFontJsonFromFile('piwo_10.dat'),
    "Piwo 8px" : createFontJsonFromFile('piwo_8.dat'),
    "Piwo 5px" : createFontJsonFromFile('piwo_5.dat'),
}

fs.writeFileSync('list.json', JSON.stringify(fonts, 0, 2), 'utf8');
})();
