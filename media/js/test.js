function assertEq(a, b) {
    if (a != b) {
        throw a + " is not equal " + b;
    }
}

function assertLtE(a, b) {
    if (a > b) {
        throw a + " is greater than " + b;
    }
}

function assertNe(a, b) {
    if (a == b) {
        throw a + " is equal " + b;
    }
}

function assertTrue(condition) {
    if (condition) {
    } else {
        throw condition + " is not true ";
    }
}

function assertFalse(condition) {
    if (condition) {
        throw condition + " is not false ";
    }
}

function createElement(id, kind) {
    var elem = document.createElement(kind);
    elem.id = id;
    return elem;
}

class Test {
    constructor(testSuits) {
        this.testSuit = [];
        this.result = {};
        this.passed = 0;
        this.failed = 0;
        this.run = 0;
        this.started = false;
        if (testSuits) {
            this.addTestSuits(testSuits);
        }
    }

    elapsedTime() {
        if (!this.started) {
            return 0;
        }
        return this.endTime - this.startTime;
    }

    summary() {
        if (!this.started) {
            return "Tests not run";
        }
        return this.run + " tests run, " + this.passed + " passed, " +
            this.failed + " failed. Time elapsed: " + this.elapsedTime() + 'ms';
    }

    summaryHTML() {
        if (!this.started) {
            return "<span style='color:red'>Tests not run</span>";
        }
        var passedColor = this.passed > 0 ? 'green' : 'red';
        var failedColor = this.failed == 0 ? 'green' : 'red';
        var totalColor = this.passed > 1 && this.failed == 0 ? 'green' : 'red';
        return "<span style='color:" + totalColor + "'>" + this.run +
            "</span> tests run, <span style='color:" + passedColor + "'>" +
            this.passed + "</span> passed, <span style='color:" + failedColor + "'>" +
            this.failed + "</span> failed. Time elapsed: " + this.elapsedTime() + 'ms';
    }

    toString() {
        var out = "";
        var result = this.result;
        var testSuits = Object.keys(result);
        testSuits.forEach(function(testSuit) {
            out += testSuit + ' ' + result[testSuit].timeConsumed_Reserved  + "ms\n";
            var tests = Object.keys(result[testSuit]);
            tests.forEach(function(test) {
                if (test == 'timeConsumed_Reserved') return;
                var err = result[testSuit][test].error;
                err = err ? " " + err : "";
                out += "\t[" + result[testSuit][test].status + "] " + test + err + "\n" ;
            });
        });
        return out + this.summary();
    }

    toHTML() {
        var out = "";
        var result = this.result;
        var testSuits = Object.keys(result);
        testSuits.forEach(function(testSuit) {
            out +=  '<b>' + testSuit + '</b> ' + result[testSuit].timeConsumed_Reserved  + "ms<br>\n";
            var tests = Object.keys(result[testSuit]);
            tests.forEach(function(test) {
                if (test == 'timeConsumed_Reserved') return;
                var err = result[testSuit][test].error;
                err = err ? " - <span style='color:red'>" + err + "</span>" : "";
                var color = result[testSuit][test].status == 'PASS' ? 'green' : 'red';

                out += "&nbsp;&nbsp;<span style='color:" + color + "'>[" +
                    result[testSuit][test].status + "]</span> " + test + err + "<br>\n" ;
            });
        });
        return out + this.summaryHTML();
    }

    addTestSuits(testSuits) {
        if (! Array.isArray(testSuits)) testSuits = [testSuits];
        this.testSuit.push(...testSuits);
    }

    runTestsFromTestSuit(testSuit) {
        if (typeof testSuit == "function")
        {
            testSuit = new testSuit;
        }
        var methods = Object.getOwnPropertyNames(Object.getPrototypeOf(testSuit));
        var start = new Date();
        var testSuitName = testSuit.constructor.name;
        this.result[testSuitName] = [];
        for (var i=0; i<methods.length; i++)
        {
            var method = methods[i];
            if (methods[i] == "constructor" || methods[i] == "SetUp") continue;

            this.run += 1;
            try {
                if (testSuit.SetUp) {
                    testSuit.SetUp();
                }
                testSuit[method]();
                this.passed += 1;
                this.result[testSuitName][method] = {status: "PASS"};
            } catch (e) {
                this.failed += 1;
                this.result[testSuitName][method] = {status: "FAIL", error: e};
            }
        }
        this.result[testSuitName].timeConsumed_Reserved = new Date() - start;
    }

    runAllTests() {
        this.started = true;
        this.startTime = new Date();
        for(var i=0;i<this.testSuit.length;i++)
        {
            this.runTestsFromTestSuit(this.testSuit[i]);
        }
        this.endTime = new Date();
    }
}

class GeneralMock {
    constructor(methods) {
        this._methods = {};
        this.addMethods(methods);
    }

    addMethods(methods) {
        if (!Array.isArray(methods)) {
            methods = [methods];
        }
        for (var i=0;i<methods.length;i++) {
            this._addMethod(methods[i]);
        }
    }

    _addMethod(method) {
        if (this._methods[method] == undefined) {
            this._methods[method] = {called: 0};
            var mock = this;
            this[method] = function(...params) {
                mock._methods[method].called++;
                mock._methods[method].param = params;
            }
        }
    }

    _methodExists(method) {
        if (this._methods[method] == undefined) {
            throw "Mock for " + method + " does not exists";
        }
    }

    called(method) {
        this._methodExists(method);
        if (this._methods[method].called < 1) {
            throw method + " was never called";
        }
    }

    calledOnce(method) {
        this._methodExists(method);
        if (this._methods[method].called != 1) {
            throw method + " was expected to be call once. Calls number: " +
                this._methods[method].called;
        }
    }

    calledTimes(method, times) {
        this._methodExists(method);
        if (this._methods[method].called != times) {
            throw method + " was expected to be call " + times +
                " times. Actual calls number: " + this._methods[method].called;
        }
    }

    getLastCallParam(method, paramNumber = 0) {
        if (paramNumber < 0) {
            throw "Invalid paramNumber";
        }
        this.called(method);
        return this._methods[method].param[paramNumber];
    }
}

class FakeTest {
    constructor() {
        this.runs = 0;
    }

    success() {
        this.runs++;
    }

    success2() {
        this.runs++;
    }

    fail() {
        this.runs++;
        throw "fake ex";
    }
}

class Fake2Test {

}

class TestTest {
    shouldCountPassedAndFailedTests() {
        var test = new Test(FakeTest);
        test.runAllTests();
        assertEq(2, test.passed);
        assertEq(1, test.failed);
        assertEq(3, test.run);
    }

    shouldRunEachFunctionFromTestSuit() {
        var testSuit = new FakeTest;
        var test = new Test(testSuit);
        test.runAllTests();
        assertEq(3, testSuit.runs);
    }

    shouldAddTestSuitByReference() {
        var test = new Test(new FakeTest);
        assertEq(1, test.testSuit.length);
        test.runAllTests();
    }

    shouldAddTestSuitByClassName() {
        var test = new Test(FakeTest);
        assertEq(1, test.testSuit.length);
        test.runAllTests();
    }

    shouldAddTestFromArray() {
        var test = new Test([FakeTest]);
        assertEq(1, test.testSuit.length);
        test.runAllTests();
    }

    shouldAppendAddedTests() {
        var test = new Test([FakeTest]);
        assertEq(1, test.testSuit.length);
        test.addTestSuits([Fake2Test]);
        assertEq(2, test.testSuit.length);
    }
}

class GeneralMockTest {
    shouldDetectMethodCall() {
        var mock = new GeneralMock(["test"]);
        mock.test();
        mock.called("test");
    }

    shouldThrowWhenMethodDoesNotExist() {
        var mock = new GeneralMock([]);
        var expCatched = false;
        try { mock.test(); }
        catch { expCatched = true };
        assertTrue(expCatched);
    }

    shouldAddMultipleMethods() {
        var mock = new GeneralMock(["testA", "testB"]);
        mock.testA();
        mock.testB();
    }

    shouldCheckNumberOfCalls() {
        var mock = new GeneralMock(["test"]);
        mock.test();
        mock.test();
        mock.calledTimes("test", 2);
    }

    shouldCheckCalledOnce() {
        var mock = new GeneralMock(["test"]);
        mock.test();
        mock.calledOnce("test");
    }

    calledOnceShouldAcceptMultipleCalls() {
        var mock = new GeneralMock(["test"]);
        mock.test();
        mock.test();
        var expCatched = false;
        try { mock.calledOnce("test"); }
        catch { expCatched = true };
        assertTrue(expCatched);
    }

    shouldAddSingleMethod() {
        var mock = new GeneralMock("test");
        mock.test();
        mock.called("test");
    }

    shoudAddNextMethods() {
        var mock = new GeneralMock(["testA"]);
        mock.testA();
        mock.addMethods(["testB"]);
        mock.testB();
        mock.called("testA");
        mock.called("testB");
    }

    shouldStoreFiveParamsFromCall() {
        var param0 = 0;
        var param1 = 1;
        var param2 = 2;
        var param3 = 3;
        var param4 = 4;
        var mock = new GeneralMock(["test"]);
        mock.test(param0, param1, param2, param3, param4);
        assertEq(param0, mock.getLastCallParam("test", 0));
        assertEq(param1, mock.getLastCallParam("test", 1));
        assertEq(param2, mock.getLastCallParam("test", 2));
        assertEq(param3, mock.getLastCallParam("test", 3));
        assertEq(param4, mock.getLastCallParam("test", 4));
    }

    shouldThorwWhenAccessingParamBeforeCall() {
        var mock = new GeneralMock(["test"]);
        var expCatched = false;
        try { mock.getLastCallParam("test", 0); }
        catch { expCatched = true };
        assertTrue(expCatched);
    }

    shouldStoreLastCallParam() {
        var param = 1;
        var newParam = 2;
        var mock = new GeneralMock(["test"]);
        mock.test(param);
        mock.test(newParam);
        assertEq(newParam, mock.getLastCallParam("test", 0));
    }

    shouldReturnParam0IfParamNotSpecified() {
        var param0 = 0;
        var param1 = 1;
        var mock = new GeneralMock(["test"]);
        mock.test(param0, param1);
        assertEq(param0, mock.getLastCallParam("test"));
    }

    shouldThrowWhenParamNumberOutOfRange() {
        var expCatched = false;
        var mock = new GeneralMock(["test"]);
        mock.test();
        try { mock.getLastCallParam("test", -1); }
        catch { expCatched = true };
        assertTrue(expCatched);
    }
}

class LayerTest {
    constructor() {
        this.x = 12;
        this.y = 10;
        this.duration = 200;
        this.opacity = 80;
    }

    checkSize() {
        var layer = new Layer(this.x, this.y);
        assertEq(this.x, layer.x);
        assertEq(this.y, layer.y);
    }

    checkDefaultValues() {
        var layer = new Layer(this.x, this.y);
        assertEq(Settings.DEFAULT_LAYER_COLOR, layer.pixel[0][0]);
        assertEq(Settings.DEFAULT_OPACITY, layer.opacity);
    }

    checkColor() {
        var red = 0xFF0000;
        var layer = new Layer(this.x, this.y, red);
        assertEq(red, layer.pixel[0][0]);
    }

    checkCloneIsSame(){
        var layer = new Layer(this.x, this.y);
        var cloned = layer.clone();
        assertEq(cloned.x, layer.x);
        assertEq(cloned.y, layer.y);
        assertEq(cloned.opacity, layer.opacity);
        assertEq(cloned.pixel[0][0], layer.pixel[0][0]);
    }

    checkCreationOfTransparentFrame() {
        var layer = new Layer(this.x, this.y);
        var created = layer.createTransparent();
        assertEq(created.x, layer.x);
        assertEq(created.y, layer.y);
        assertEq(undefined, layer.pixel[0][0]);
    }

    checkColorChange() {
        var red = 0xFF0000;
        var blue = 0xFF;
        var layer = new Layer(2, 2, blue);
        layer.setColor(red);
        assertEq(red, layer.pixel[0][0]);
        assertEq(red, layer.pixel[0][1]);
        assertEq(red, layer.pixel[1][0]);
        assertEq(red, layer.pixel[1][1]);
    }

    changingCloneShoudntChangeOriginalLayer() {
        var color1 = 0xFF;
        var color2 = 0xFFFF;
        var layer = new Layer(this.x, this.y, 0xFF);
        var clone = layer.clone();
        assertEq(color1, layer.pixel[0][0]);
        assertEq(color1, clone.pixel[0][0]);
        clone.pixel[0][0] = color2;
        assertEq(color1, layer.pixel[0][0]);
        assertEq(color2, clone.pixel[0][0]);
    }

    checkResizedLayerSize() {
        var layer = new Layer(this.x, this.y);
        layer.resize(-1,-1, 1, 0);
        assertEq(this.x-2, layer.x);
        assertEq(this.y+1, layer.y);
    }

    checkResizedLayerFillColor() {
        var fillColor = 0xFF;
        var layer = new Layer(this.x, this.y);
        layer.resize(1, 1, 1, 1, fillColor);
        assertEq(fillColor, layer.pixel[0][0]);
    }

    checkResizeMovedPixel() {
        var pixelColor = 0xFF;
        var layer = new Layer(this.x, this.y);
        layer.pixel[1][1] = pixelColor;
        layer.resize(-1, 0, -1, 0);
        assertEq(pixelColor, layer.pixel[0][0]);
    }
}

class FrameTest {
    SetUp() {
        this.x = 2;
        this.y = 2;
        this.duration = 200;
    }

    checkSize() {
        var frame = new Frame(this.x, this.y, this.duration);
        assertEq(this.x, frame.x);
        assertEq(this.y, frame.y);
    }

    checkDuration() {
        var frame = new Frame(this.x, this.y, this.duration);
        assertEq(this.duration, frame.duration);
    }

    checkDurationValidation() {
        var tooShortDuration = 1;
        var minimumDuration = 10;
        var frame = new Frame(this.x, this.y, tooShortDuration);
        assertEq(minimumDuration, frame.duration);
        var invalidStepDuration = 102;
        var roundedStepDuration = 100;
        frame.duration = invalidStepDuration;
        assertEq(roundedStepDuration, frame.duration);
    }

    checkSizeOfCreatedLayer() {
        var frame = new Frame(this.x, this.y, this.duration);
        var layer = frame.createNewLayer();
        assertEq(frame.x, layer.x);
        assertEq(frame.y, layer.y);
    }

    checkCloneIsSame(){
        var frame = new Frame(this.x, this.y, this.duration);
        var cloned = frame.clone();
        assertEq(cloned.x, frame.x);
        assertEq(cloned.y, frame.y);
        assertEq(cloned.duration, frame.duration);
        assertEq(cloned.layer[0].pixel[0][0], frame.layer[0].pixel[0][0]);
    }

    checkMergeTransparentColor() {
        var frame = new Frame(this.x, this.y, this.duration);
        var red = 0xFF0000;
        var green = 0xFF;
        var opacity = 40;
        frame.layer.push(frame.createNewLayer(red, 100));
        frame.layer.push(frame.createNewLayer(green, opacity));
        assertEq(0x990066, frame.getPixelColor(0, 0));
    }

    changingCloneShoudntChangeOriginalFrame() {
        var color1 = 0xFF;
        var color2 = 0xFFFF;
        var frame = new Frame(this.x, this.y, 0xFF);
        frame.layer[0].pixel[0][0] = color1;
        var clone = frame.clone();
        assertEq(color1, frame.layer[0].pixel[0][0]);
        assertEq(color1, clone.layer[0].pixel[0][0]);
        clone.layer[0].pixel[0][0] = color2;
        assertEq(color1, frame.layer[0].pixel[0][0]);
        assertEq(color2, clone.layer[0].pixel[0][0]);
    }

    framesShoudlHaveUniqueIds() {
        var last = undefined;
        var frame = new Frame(2,2);
        var current = frame.id;
        assertNe(last, current);
        last = current;
        current = new Frame(3,3).id;
        assertNe(last, current);
        last = current;
        current = frame.clone().id;
        assertNe(last, current);
    }

    frameResizeShouldResizeAllLayers() {
        var frame = new Frame(this.x, this.y, this.duration);
        frame.layer[1] = frame.layer[0].clone();
        frame.resize(1, 0, 2, 0);
        assertEq(this.x+1, frame.layer[0].x);
        assertEq(this.x+1, frame.layer[1].x);
        assertEq(this.y+2, frame.layer[0].y);
        assertEq(this.y+2, frame.layer[1].y);
    }

}

class TestHelper
{
    static createCtxMock() {
        return {fillRect: () => {} , beginPath: () => {}, setLineDash: () => {} ,
                moveTo: () => {}, lineTo: () => {}, stroke: () => {}};
    }
    static createCanvasMock(x, y) {
        return {scrollWidth: x, scrollHeight: y, getContext: function() {return TestHelper.createCtxMock()}};
    }

    static createTimeSource() {
        return {play: () => { }, pause: () => { }, currentTime: 0};
    }
}

class DisplayTest
{
    constructor() {
        this.displayX = 105;
        this.displayY = 205;
    }

    canvasWithoutFrameShouldHasSameSize() {
        var canvas = TestHelper.createCanvasMock(this.displayX, this.displayY);
        var display = new Display(canvas);
        assertEq(canvas.scrollWidth, display.x);
        assertEq(canvas.scrollHeight, display.y);
    }

    canvasWithFrameShouldRoundSizeToMultileOfFrameSize() {
        var x = 100;
        var y = 200;
        var canvas = TestHelper.createCanvasMock(this.displayX, this.displayY);
        var frame = new Frame(10, 10);
        var display = new Display(canvas, frame);
        assertEq(x, display.x);
        assertEq(y, display.y);
    }

    frameIsRemovedWhenDisplayIsReset() {
        var canvas = TestHelper.createCanvasMock(this.displayX, this.displayY);
        var frame = new Frame(10, 10);
        var display = new Display(canvas, frame);
        assertNe(undefined, display.frame);
        display.resetDisplay();
        assertEq(undefined, display.frame);
    }

    canvasIsResizedWhenSizeChanged() {
        var canvas = TestHelper.createCanvasMock(this.displayX, this.displayY);
        var display = new Display(canvas);
        var newWidth = 800;
        var newHeight = 400;
        display.canvas.scrollWidth = newWidth;
        display.canvas.scrollHeight = newHeight;
        display.updateCanvasSize();
        assertEq(newWidth, display.canvas.width);
        assertEq(newHeight, display.canvas.height);
    }

    cadAddFrame() {
        var canvas = TestHelper.createCanvasMock(this.displayX, this.displayY);
        var frame = new Frame(10, 10);
        var display = new Display(canvas);
        assertEq(undefined, display.frame);
        display.setFrame(frame);
        assertNe(undefined, display.frame);
    }
}

class UtilsTest {
    testOpacity() {
        assertEq(100, Utils.sanitizeOpacity(150));
        assertEq(0, Utils.sanitizeOpacity(-50));
        assertEq(50, Utils.sanitizeOpacity(50));

    }

    testRGB() {
        var color = Utils.intToRGB(0x123456);
        assertEq(0x12, color.r);
        assertEq(0x34, color.g);
        assertEq(0x56, color.b);
    }

    testHTMLColor() {
        assertEq('#000001', Utils.intToHTMLColor(0x1));
        assertEq('#00ff00', Utils.intToHTMLColor(0xFF00));
        assertEq('#ffffff', Utils.intToHTMLColor(0xFFFFFF));
        assertEq('#123456', Utils.intToHTMLColor(0x123456));
    }
    testHtmlToInt() {
        assertEq(0x1, Utils.htmlToInt('#000001'));
        assertEq(0xFF00, Utils.htmlToInt('#00ff00'));
        assertEq(0xFFFFFF, Utils.htmlToInt('#ffffff'));
        assertEq(0x123456, Utils.htmlToInt('#123456'));
    }
}

class PainterTest {
    SetUp() {
        var canvas = TestHelper.createCanvasMock(100, 100);
        var frame = new Frame(10, 10);
        var display = new Display(canvas, frame);
        this.painter = new Painter(display, new History);
        this.painter.tool = new PenTool;
        this.pos1 = {x: 1, y : 1};
        this.pos2 = {x: 2, y : 2};
        this.pos3 = {x: 3, y : 3};
        this.evtPos1 = {offsetX: this.pos1.x*10+5, offsetY : this.pos1.y*10+5};
        this.evtPos2 = {offsetX: this.pos2.x*10+5, offsetY : this.pos2.y*10+5};
        this.evtPos3 = {offsetX: this.pos3.x*10+5, offsetY : this.pos3.y*10+5};
        this.startPos = {x:-1, y: -1};
        this.painter.lastCursorPos = this.startPos;
    }

    checkMovingCursor() {
        this.painter.startDrawing(this.evtPos1);
        assertEq(this.painter.lastCursorPos.x, this.pos1.x);
        assertEq(this.painter.lastCursorPos.y, this.pos1.y);
        this.painter.processDrawing(this.evtPos1);
        assertEq(this.painter.lastCursorPos.x, this.pos1.x);
        assertEq(this.painter.lastCursorPos.y, this.pos1.y);
        this.painter.processDrawing(this.evtPos2);
        assertEq(this.painter.lastCursorPos.x, this.pos2.x);
        assertEq(this.painter.lastCursorPos.y, this.pos2.y);
        this.painter.finishDrawing();
        assertEq(this.painter.lastCursorPos.x, this.startPos.x);
        assertEq(this.painter.lastCursorPos.y, this.startPos.y);
    }

    checkPenTool() {
        this.painter.tool = new PenTool;
        this.painter.startDrawing(this.evtPos1);
        assertTrue(this.painter.display.editLayer);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos1.x][this.pos1.y]);
        this.painter.processDrawing(this.evtPos2);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos2.x][this.pos2.y]);
    }

    checkLineTool() {
        this.painter.tool = new LineTool;
        this.painter.startDrawing(this.evtPos1);
        assertTrue(this.painter.display.editLayer);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos1.x][this.pos1.y]);
        this.painter.processDrawing(this.evtPos3);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos2.x][this.pos2.y]);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos3.x][this.pos3.y]);
    }

    checkFillTool() {
        this.painter.tool = new FillTool;
        this.painter.startDrawing(this.evtPos1);
        assertFalse(this.painter.display.editLayer);
        this.painter.processDrawing(this.evtPos2);
        assertFalse(this.painter.display.editLayer);
        this.painter.finishDrawing()
        assertEq(this.painter.color.first, this.painter.display.frame.layer[0].pixel[0][0]);
    }

    checkRectTool() {
        this.painter.tool = new RectTool;
        this.painter.startDrawing(this.evtPos1);
        assertTrue(this.painter.display.editLayer);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos1.x][this.pos1.y]);
        this.painter.processDrawing(this.evtPos3);
        assertEq(undefined, this.painter.display.editLayer.pixel[this.pos2.x][this.pos2.y]);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos3.x][this.pos3.y]);
    }

    checkFilledRectTool() {
        this.painter.tool = new FilledRectTool;
        this.painter.startDrawing(this.evtPos1);
        assertTrue(this.painter.display.editLayer);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos1.x][this.pos1.y]);
        this.painter.processDrawing(this.evtPos3);
        assertEq(this.painter.color.second, this.painter.display.editLayer.pixel[this.pos2.x][this.pos2.y]);
        assertEq(this.painter.color.first, this.painter.display.editLayer.pixel[this.pos3.x][this.pos3.y]);
    }

    shouldSaveEditAfterFinishedDrawing() {
        this.painter.tool = new PenTool;
        this.painter.startDrawing(this.evtPos1);
        this.painter.finishDrawing();
        assertEq(this.painter.color.first, this.painter.display.frame.layer[0].pixel[this.pos1.x][this.pos1.y]);
        assertEq(0, this.painter.display.frame.layer[0].pixel[0][0]);
    }

    shouldSwitchColorsForRightClick() {
        this.painter.tool = new PenTool;
        var rightBtn = 3;
        this.evtPos1.which = rightBtn;
        this.painter.startDrawing(this.evtPos1);
        assertTrue(this.painter.display.editLayer);
        assertEq(this.painter.color._second, this.painter.display.editLayer.pixel[this.pos1.x][this.pos1.y]);
    }

    callOnFrameEditedOnFinish() {
        var editedFrame;
        this.painter.tool = new PenTool;
        this.painter.display.onFrameEdited = function(eFrame) { editedFrame = eFrame};
        this.painter.startDrawing(this.evtPos1);
        this.painter.finishDrawing();
        assertEq(editedFrame.id, this.painter.display.frame.id);
    }

    shouldNotThrowWhenEditorIsUndefined() {
        this.painter.applyEditor(undefined);
    }

    shouldApplyEditor() {
        var editor = function(layer, color) {
            layer.pixel[0][0] = color.first;
        }
        this.painter.applyEditor(editor);
        assertEq(this.painter.color.first, this.painter.display.frame.layer[0].pixel[0][0]);
    }
}

class LayerEditorTest {
    SetUp() {
        this.x = 4;
        this.y = 4;
        this.color = new Color(0xFF0000, 0xFF);
        this.bgColor = 0;
        this.layer = new Layer(this.x, this.y, this.bgColor);
    }

    checkNegative() {
        this.layer.pixel[0][0] = 0xFF;
        LayerEditor.negative(this.layer);
        assertEq(0xFFFF00, this.layer.pixel[0][0]);
        assertEq(0xFFFFFF, this.layer.pixel[1][1]);
    }

    moveShouldFillPaddingWithSecondColor() {
        LayerEditor.moveRight(this.layer, this.color);
        assertEq(this.color.second, this.layer.pixel[0][0]);
    }

    checkMoveRight() {
        this.layer.pixel[1][1] = this.color.first;
        LayerEditor.moveRight(this.layer, this.color);
        assertEq(this.color.first, this.layer.pixel[2][1]);
    }

    checkMoveLeft() {
        this.layer.pixel[1][1] = this.color.first;
        LayerEditor.moveLeft(this.layer, this.color);
        assertEq(this.color.first, this.layer.pixel[0][1]);
    }

    checkMoveUp() {
        this.layer.pixel[1][1] = this.color.first;
        LayerEditor.moveUp(this.layer, this.color);
        assertEq(this.color.first, this.layer.pixel[1][0]);
    }

    checkMoveDown() {
        this.layer.pixel[1][1] = this.color.first;
        LayerEditor.moveDown(this.layer, this.color);
        assertEq(this.color.first, this.layer.pixel[1][2]);
    }

    checkReverseVertically() {
        this.layer.pixel[1][0] = this.color.first;
        LayerEditor.reverseVertically(this.layer);
        assertEq(this.color.first, this.layer.pixel[1][3]);
    }

    checkReverseHorizontaly() {
        this.layer.pixel[0][1] = this.color.first;
        LayerEditor.reverseHorizontaly(this.layer);
        assertEq(this.color.first, this.layer.pixel[3][1]);
    }
}

class FrameListTest {
    SetUp() {
        this.x = 10;
        this.y = 10;
        this.listWidget = document.createElement('div');
        this.list = new FrameList(this.x, this.y, this.listWidget, new History);
    }

    selectRange() {
        var evt = {shiftKey: 1};
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.listWidget.children[2].onclick(evt);
        assertEq(3, this.list.allSelected().length);
    }

    newFrameListShoudHaveOneFrame() {
        assertEq(1, this.list.getFrameCount());
    }

    checkSizeOfCreatedFrame() {
        var frame = this.list.createEmptyFrame();
        assertEq(this.x, frame.x);
        assertEq(this.y, frame.y);
    }

    canRemoveOneFrame() {
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        assertEq(2, this.list.getFrameCount());
        this.list.removeFrame(0);
        assertEq(1, this.list.getFrameCount());
    }

    canRemoveMultiplaFrames() {
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        assertEq(3, this.list.getFrameCount());
        this.list.removeFrames([1,2]);
        assertEq(1, this.list.getFrameCount());
    }

    checkPositionOfAddedFrame() {
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        var frame = this.list.createEmptyFrame();
        var position = 1;
        this.list.addFrame(frame, position);
        assertEq(frame.id, this.list.getFrame(position).id);
    }

    canGetFrameFromList() {
        assertTrue(this.list.getFrame(0));
    }

    addOneFrame() {
        var frame = this.list.createEmptyFrame();
        this.list.addFrame(frame, 0);
        assertEq(2, this.list.getFrameCount());
        assertTrue(this.list.getFrame(1));
    }

    addMultipleFrames() {
        var frame1 = this.list.createEmptyFrame();
        var frame2 = this.list.createEmptyFrame();
        this.list.addFrames([frame1, frame2], 0);
        assertEq(3, this.list.getFrameCount());
        assertTrue(this.list.getFrame(1));
    }

    checkPositionOfMultipleAddedFrames() {
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        var position = 1;
        var frame1 = this.list.createEmptyFrame();
        var frame2 = this.list.createEmptyFrame();
        this.list.addFrames([frame1, frame2], position);
        assertEq(4, this.list.getFrameCount());
        assertEq(frame1.id, this.list.getFrame(position).id);
        assertEq(frame2.id, this.list.getFrame(position+1).id);
    }

    changeNewFrameDuration() {
        var duration = 800;
        this.list.setNewFrameDuration(duration);
        var frame = this.list.createEmptyFrame();
        assertEq(duration, frame.duration);
    }

    addFrameOnTheEnd() {
        this.list.addFrame(this.list.createEmptyFrame(), 1);
        assertEq(2, this.list.getFrameCount());
    }

    shouldntThrowWhenRemovePositionIsOutOfBounds() {
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        assertEq(2, this.list.getFrameCount());
        this.list.removeFrame(-1);
        this.list.removeFrame(99999);
        assertEq(2, this.list.getFrameCount());
    }

    frameWidgetListHaveSameOrder() {
        this.list.addFrame(this.list.createEmptyFrame(), 1);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(this.list.createEmptyFrame(), 2);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        var listWidgetChild = this.listWidget.children;
        assertEq(5, listWidgetChild.length);
        assertEq('frame' + this.list.getFrame(0).id, listWidgetChild[0].id);
        assertEq('frame' + this.list.getFrame(1).id, listWidgetChild[1].id);
        assertEq('frame' + this.list.getFrame(2).id, listWidgetChild[2].id);
        assertEq('frame' + this.list.getFrame(3).id, listWidgetChild[3].id);
        assertEq('frame' + this.list.getFrame(4).id, listWidgetChild[4].id);
    }

    findPositionByFrameId() {
        var frame = this.list.createEmptyFrame();
        var pos = 2;
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(frame, pos);
        assertEq(pos, this.list.getPositionByFrameId(frame.id));
    }

    shouldSetCurrent() {
        var frame = this.list.createEmptyFrame();
        var pos = 1;
        this.list.addFrame(frame, pos);
        assertEq(0, this.list.getCurrentPos());
        this.list.setCurrent(pos);
        assertEq(1, this.list.getCurrentPos());
    }

    shouldSelectTwoFrames() {
        var frame1 = this.list.createEmptyFrame();
        var frame2 = this.list.createEmptyFrame();
        var pos1 = 1;
        var pos2 = 2;
        this.list.addFrame(frame1, pos1);
        this.list.addFrame(frame2, pos2);
        this.list.toggleSelection(frame1.id, pos1);
        this.list.toggleSelection(frame2.id, pos2);
        assertEq(pos1, this.list.selected[0]);
        assertEq(pos2, this.list.selected[1]);
    }

    shouldUnselectSelectedFrame() {
        var frame = this.list.createEmptyFrame();
        var pos = 1;
        this.list.addFrame(frame, pos);
        assertEq(0, this.list.selected.length);
        this.list.toggleSelection(frame.id, pos);
        assertEq(pos, this.list.selected[0]);
        this.list.toggleSelection(frame.id, pos);
        assertEq(0, this.list.selected.length);
    }

    selectByFrameId() {
        var frame = this.list.createEmptyFrame();
        var pos = 1;
        this.list.addFrame(frame, pos);
        assertEq(0, this.list.selected.length);
        this.list.toggleSelectByFrameId(frame.id);
        assertEq(pos, this.list.selected[0]);
    }

    setCurrentByFrameId() {
        var frame = this.list.createEmptyFrame();
        var pos = 1;
        this.list.addFrame(frame, pos);
        assertEq(0, this.list.getCurrentPos());
        this.list.setCurrentByFrameId(frame.id);
        assertEq(1, this.list.getCurrentPos());
    }

    shouldNofifyOnCurrentChange() {
        var frame = this.list.createEmptyFrame();
        var destFrame;
        var pos = 1;
        this.list.onCurrentChanged = function(sFrame) { destFrame = sFrame };
        this.list.addFrame(frame, pos);
        this.list.setCurrent(pos);
        assertEq(destFrame.id, frame.id);
    }

    shouldAddFrameAfterCurrent() {
        var firstFrameId = this.list.frame[0].id;
        this.list.addNewFrame();
        assertEq(2, this.list.frame.length);
        assertEq(firstFrameId, this.list.frame[0].id);
    }

    newFrameShouldBeCurrentFrame() {
        this.list.addNewFrame();
        assertEq(1, this.list.getCurrentPos());
    }

    checkIfDurationOfNewFrameIsEqualCurrentFrameDuration() {
        var duration = 800;
        this.list.frame[0].duration = duration;
        this.list.addNewFrame();
        assertEq(duration, this.list.frame[1].duration);
    }

    removeCurrentFrame() {
        this.list.addNewFrame();
        assertEq(2, this.list.frame.length);
        this.list.removeSelected();
        assertEq(1, this.list.frame.length);
    }

    shouldChangeCurrentFrameAfterRemoval() {
        this.list.addNewFrame();
        assertEq(1, this.list.getCurrentPos());
        this.list.removeSelected();
        assertEq(0, this.list.getCurrentPos());
    }

    shouldRemoveCurrentAndSelectedFrame() {
        this.list.addNewFrame();
        this.list.addNewFrame();
        this.list.toggleSelection(this.list.frame[1].id, 1);
        assertEq(3, this.list.frame.length);
        this.list.removeSelected();
        assertEq(1, this.list.frame.length);
    }

    setAndGetCurrentFrameDuration() {
        var duration = 700;
        this.list.currentFrameDuration = duration;
        assertEq(duration, this.list.currentFrameDuration);
        var frame = this.list.createEmptyFrame();
        this.list.addFrame(frame);
        this.list.setCurrent(frame.id);
        assertEq(duration, this.list.currentFrameDuration);

    }

    createFirstFrameOnlyWhenListIsEmpty() {
        this.list.removeFrame(0);
        assertEq(1, this.list.frame.length);
        var frameId = this.list.getFrame(0).id;
        this.list.createFirstFrame();
        assertEq(1, this.list.frame.length);
        assertEq(frameId, this.list.getFrame(0).id);
    }

    shouldNotAllowToEditWhenIsBlocked() {
        this.list.addNewFrame();
        assertEq(2, this.list.frame.length);
        this.list.block();
        this.list.addNewFrame();
        assertEq(2, this.list.frame.length);
        this.list.removeFrame(0);
        assertEq(2, this.list.frame.length);

    }

    unblockAllowToEditAgain() {
        this.list.block();
        this.list.unblock();
        assertEq(1, this.list.frame.length);
        this.list.addNewFrame();
        assertEq(2, this.list.frame.length);
    }

    checkCurrentFrameTime() {
        this.list.addNewFrame();
        this.list.addNewFrame();
        this.list.setCurrent(1);
        assertEq(100, this.list.getCurentFrameTime());
        this.list.setCurrent(2);
        assertEq(200, this.list.getCurentFrameTime());
    }

    showFrameByTimeShouldCallCallback() {
        var resultFrame;
        this.list.onCurrentChanged = function (frame) {
            resultFrame = frame;
        };
        this.list.addNewFrame();
        this.list.addNewFrame();
        this.list.showFrameByTime(0.11)
        assertEq(this.list.getFrame(1).id, resultFrame.id)
    }

    resizeShouldChangeResoultion() {
        this.list.resize(1, 0, 2, 0);
        assertEq(this.x+1, this.list.x);
        assertEq(this.y+2, this.list.y);
    }

    resizeShouldResizeAllFrames() {
        this.list.addNewFrame();
        this.list.resize(1, 0, 2, 0);
        assertEq(this.x+1, this.list.frame[0].x);
        assertEq(this.x+1, this.list.frame[1].x);
        assertEq(this.y+2, this.list.frame[0].y);
        assertEq(this.y+2, this.list.frame[1].y);
    }
}

class FrameWidgetControllerTest {
    SetUp() {
        this.x = 10;
        this.y = 10;
        this.listWidget = document.createElement('div');
        this.list = new FrameList(this.x, this.y, this.listWidget, new History);
        this.controller = new FrameWidgetController(this.listWidget);
    }

    selectTwoFrames() {
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.controller.select(this.list.getFrame(1).id);
        this.controller.select(this.list.getFrame(2).id);
        var frameWidgets = this.listWidget.querySelectorAll('.frameSelected');
        assertEq(2, frameWidgets.length);
    }

    selectByClick() {
        var evt = {ctrlKey: 1};
        this.list.addFrame(this.list.createEmptyFrame(), 0);
        this.listWidget.children[0].onclick(evt);
        var frameWidgets = this.listWidget.querySelectorAll('.frameSelected');
        assertEq(1, frameWidgets.length);
    }

    changeCurrent() {
        var frame1 = this.list.getFrame(0);
        var frame2 = this.list.createEmptyFrame();
        this.list.addFrame(frame2, 1);
        assertEq('frameCurrent', this.listWidget.querySelector('#frame' + frame1.id).className);
        assertEq('frame', this.listWidget.querySelector('#frame' + frame2.id).className);
        this.controller.setCurrent(frame2.id);
        assertEq('frame', this.listWidget.querySelector('#frame' + frame1.id).className);
        assertEq('frameCurrent', this.listWidget.querySelector('#frame' + frame2.id).className);
    }

    canUnselectAllSelectedFrames() {
        this.list.addFrame(this.list.createEmptyFrame(), 1);
        this.list.addFrame(this.list.createEmptyFrame(), 2);
        this.controller.select(this.list.getFrame(1).id);
        this.controller.select(this.list.getFrame(2).id);
        var frameWidgets = this.listWidget.querySelectorAll('.frameSelected');
        assertEq(2, frameWidgets.length);
        this.controller.unselectAll();
        frameWidgets = this.listWidget.querySelectorAll('.frameSelected');
        assertEq(0, frameWidgets.length);
    }

    canUnselect() {
        var frame = this.list.createEmptyFrame();
        this.list.addFrame(frame, 1);
        this.controller.select(frame.id);
        var frameWidgets = this.listWidget.querySelectorAll('.frameSelected');
        assertEq(1, frameWidgets.length);
        this.controller.unselect(frame.id);
        frameWidgets = this.listWidget.querySelectorAll('.frameSelected');
        assertEq(0, frameWidgets.length);
    }

    canSelectAll() {
        this.list.addFrame(this.list.createEmptyFrame(), 1);
        this.list.addFrame(this.list.createEmptyFrame(), 2);
        this.list.addFrame(this.list.createEmptyFrame(), 3);
        this.list.addFrame(this.list.createEmptyFrame(), 4);
        this.controller.selectAll();
        var frameWidgets = this.listWidget.querySelectorAll('.frameSelected');
        assertEq(4, frameWidgets.length);
    }
}

class MenuTest {
    SetUp() {
        // TODO wyrownac
        this.toolMenu = document.createElement('div');

        this.toolMenu.id = 'toolMenu';
        var topMenu = document.createElement('div');
        topMenu.appendChild(this.toolMenu);

        this.colorMenu = document.createElement('div');

        this.box = document.createElement('div');
        this.box.appendChild(createElement('generateText', 'input'));
        this.box.appendChild(createElement('musicForm', 'form'));
        this.box.appendChild(createElement('fileOpen', 'form'));
        this.box.appendChild(createElement('downloadFileBtn', 'input'));
        this.box.appendChild(createElement('saveLocalBtn', 'input'));
        this.box.appendChild(createElement('resizeForm', 'form'));

        this.durationMenu = document.createElement('div');
        this.durationMenu.appendChild(createElement('durationRange', 'input'));
        this.durationMenu.appendChild(createElement('durationNumber', 'input'));

        this.painterMock =
            new GeneralMock(["setTool", "removeSelected", "applyEditor", "finishDrawing"]);
        this.button = document.createElement('div');
        var listWidget = document.createElement('div');
        var frameList = new FrameList(this.x, this.y, listWidget, new History);
        this.player = new Player(frameList, new PlayerTimeSource);
        this.menu = new Menu(this.painterMock, frameList, topMenu, this.player,
                             this.colorMenu, this.box, this.durationMenu);

    }

    checkSetPenTool() {
        this.button.id = 'penTool';
        this.toolMenu.appendChild(this.button);
        this.menu.setLineTool();
        this.menu.setPenTool();
        assertEq(PenTool, this.painterMock.getLastCallParam("setTool"))
        assertEq('penTool', this.toolMenu.querySelector('.menuButtonSelected').id);
    }

    checkSetLineTool() {
        this.button.id = 'lineTool';
        this.toolMenu.appendChild(this.button);
        this.menu.setLineTool();
        assertEq(LineTool, this.painterMock.getLastCallParam("setTool"));
        assertEq('lineTool', this.toolMenu.querySelector('.menuButtonSelected').id);
    }

    shouldUnselectOldToolButtonAndSelectNew() {
        var penButton = document.createElement('div');
        penButton.id = 'penTool';
        penButton.className = 'menuButton';
        this.toolMenu.appendChild(penButton);
        var lineButton = document.createElement('div');
        lineButton.id = 'lineTool';
        lineButton.className = 'menuButton';
        this.toolMenu.appendChild(lineButton);

        this.menu.setPenTool();
        assertEq('penTool', this.toolMenu.querySelector('.menuButtonSelected').id);
        assertEq('lineTool', this.toolMenu.querySelector('.menuButton').id);

        this.menu.setLineTool();
        assertEq('lineTool', this.toolMenu.querySelector('.menuButtonSelected').id);
        assertEq('penTool', this.toolMenu.querySelector('.menuButton').id);
    }

    checkSetRectTool() {
        this.button.id = 'rectTool';
        this.toolMenu.appendChild(this.button);
        this.menu.setRectTool();
        assertEq(RectTool, this.painterMock.getLastCallParam("setTool"));
        assertEq('rectTool', this.toolMenu.querySelector('.menuButtonSelected').id);
    }

    checkSetFilledRectTool() {
        this.button.id = 'filledRectTool';
        this.toolMenu.appendChild(this.button);
        this.menu.setFilledRectTool();
        assertEq(FilledRectTool, this.painterMock.getLastCallParam("setTool"));
        assertEq('filledRectTool', this.toolMenu.querySelector('.menuButtonSelected').id);
    }

    checkSetFillTool() {
        this.button.id = 'fillTool';
        this.toolMenu.appendChild(this.button);
        this.menu.setFillTool();
        assertEq(FillTool, this.painterMock.getLastCallParam("setTool"));
        assertEq('fillTool', this.toolMenu.querySelector('.menuButtonSelected').id);
    }

    checkAddFrame() {
        var frameListMock = new GeneralMock(["addNewFrame"]);
        this.menu.frameList = frameListMock;
        this.menu.addFrame();
        this.painterMock.calledOnce("finishDrawing");
        frameListMock.calledOnce("addNewFrame");
    }

    checkRemoveFrames() {
        var frameListMock = new GeneralMock(["removeSelected"]);
        this.menu.frameList = frameListMock;
        this.menu.removeFrames();
        frameListMock.calledOnce("removeSelected");
    }

    checkNegative() {
        this.menu.negative();
        assertEq(LayerEditor.negative, this.painterMock.getLastCallParam("applyEditor"));
    }

    checkReverseHorizontaly() {
        this.menu.reverseHorizontaly();
        assertEq(LayerEditor.reverseHorizontaly, this.painterMock.getLastCallParam("applyEditor"));
    }

    checkReverseVertically() {
        this.menu.reverseVertically();
        assertEq(LayerEditor.reverseVertically, this.painterMock.getLastCallParam("applyEditor"));
    }

    checkMoveLeft() {
        this.menu.moveLeft();
        assertEq(LayerEditor.moveLeft, this.painterMock.getLastCallParam("applyEditor"));
    }

    checkMoveUp() {
        this.menu.moveUp();
        assertEq(LayerEditor.moveUp, this.painterMock.getLastCallParam("applyEditor"));
    }

    checkMoveDown() {
        this.menu.moveDown();
        assertEq(LayerEditor.moveDown, this.painterMock.getLastCallParam("applyEditor"));
    }

    checkMoveRight() {
        this.menu.moveRight();
        assertEq(LayerEditor.moveRight, this.painterMock.getLastCallParam("applyEditor"));
    }

    checkKeyboardHandler() {
        var evt = {key: "n"};
        window.onkeyup(evt);
        assertEq(LayerEditor.negative, this.painterMock.getLastCallParam("applyEditor"));
    }
}

class PlayerTimeSourceTest {
    SetUp() {
        this.timeSource = new PlayerTimeSource;
        this.time = 10;
    }

    checkPlayAndPause() {
        this.timeSource = new PlayerTimeSource;
        assertEq(true, this.timeSource.paused);
        this.timeSource.play();
        assertEq(false, this.timeSource.paused);
        this.timeSource.pause();
        assertEq(true, this.timeSource.paused);
    }

    checkCurrentTimeDuringPause() {
        assertEq(0, this.timeSource.currentTime);
        this.timeSource.currentTime = this.time;
        assertEq(this.time, this.timeSource.currentTime);
    }

    checkCurrentTimeDuringPause() {
        this.timeSource.play();
        this.timeSource.currentTime = this.time;
        assertLtE(this.time, this.timeSource.currentTime);
    }
}

class PlayerTest {
    SetUp() {
        var duration = 1000;
        var div = document.createElement('div');
        this.frameList = new FrameList(2, 2, div, new History);
        this.frameList.currentFrameDuration = duration;
        this.frameList.setNewFrameDuration(duration);
        this.frameList.addNewFrame();
        this.frameList.addNewFrame();
        this.frameList.addNewFrame();
        this.frameList.addNewFrame();
        this.timeSource = TestHelper.createTimeSource();
        this.player = new Player(this.frameList, this.timeSource);
        this.player.setTimeOutImpl = () => {};
    }

    checkSetNewTimeSource() {
        var fakeSource = {dummyMember: 1};
        this.player.setTimeSource(fakeSource);
        assertEq(fakeSource.dummyMember, this.player.timeSource.dummyMember);
    }

    shouldNotChangeTimeSourceWhenIsPlaying() {
        var fakeSource = {dummyMember: 1};
        this.player.start();
        this.player.setTimeSource(fakeSource);
        assertFalse(this.player.timeSource.dummyMember);
        this.player.stop();
        this.player.setTimeSource(fakeSource);
        assertTrue(this.player.timeSource.dummyMember);
    }
}

function RunTests() {
    var test = new Test([TestTest, GeneralMockTest, LayerTest, FrameTest, DisplayTest,
                         UtilsTest, PainterTest, LayerEditorTest, FrameListTest,
                         MenuTest, FrameWidgetControllerTest, PlayerTest,
                         PlayerTimeSourceTest]) ;
    test.runAllTests();
    return test;
}
