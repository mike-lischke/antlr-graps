/*
 * MIT License
 *
 * Copyright (c) 2016 Mike Lischke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

#include "antlr-graps.h"

using namespace v8;

v8::Persistent<v8::Function> SourceContext::constructor;
v8::Persistent<v8::Function> ANTLRGrammarService::constructor;

//----------------------------------------------------------------------------------------------------------------------

SourceContext::SourceContext(std::string const& source) : graps::SourceContextImpl(source)
{

}

//----------------------------------------------------------------------------------------------------------------------

SourceContext::~SourceContext()
{

}

//----------------------------------------------------------------------------------------------------------------------

void SourceContext::init(v8::Local<v8::Object> exports)
{
  Isolate *isolate = exports->GetIsolate();

  // Prepare constructor template.
  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New);
  tpl->SetClassName(String::NewFromUtf8(isolate, "SourceContext"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(tpl, "infoForSymbol", infoForSymbol);

  constructor.Reset(isolate, tpl->GetFunction());
  exports->Set(String::NewFromUtf8(isolate, "SourceContext"), tpl->GetFunction());
}

//----------------------------------------------------------------------------------------------------------------------

void SourceContext::New(const FunctionCallbackInfo<Value>& args)
{
  Isolate *isolate = args.GetIsolate();

  if (args.IsConstructCall())
  {
    // Invoked as constructor: `new MyObject(...)`.
    std::string argument;
    if (!args[0]->IsUndefined())
    {
      v8::String::Utf8Value param1(args[0]->ToString());
      argument = *param1;
    }

    SourceContext *obj = new SourceContext(argument);
    obj->Wrap(args.This());
    args.GetReturnValue().Set(args.This());
  }
  else
  {
    // Invoked as plain function `MyObject(...)`, turn into construct call.
    const int argc = 1;
    Local<Value> argv[argc] = { args[0] };
    Local<Context> context = isolate->GetCurrentContext();
    Local<Function> cons = Local<Function>::New(isolate, constructor);
    Local<Object> result = cons->NewInstance(context, argc, argv).ToLocalChecked();
    args.GetReturnValue().Set(result);
  }
}

//----------------------------------------------------------------------------------------------------------------------

void SourceContext::infoForSymbol(const v8::FunctionCallbackInfo<v8::Value>& args)
{
  Isolate *isolate = args.GetIsolate();

  if (args.Length() < 1) {
    isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "Wrong number of arguments")));
    return;
  }

  if (!args[0]->IsString()) {
    isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "Wrong arguments")));
    return;
  }

  SourceContext *impl = ObjectWrap::Unwrap<SourceContext>(args.Holder());

  v8::String::Utf8Value symbol(args[0]->ToString());
  std::string info = impl->infoTextForSymbol(*symbol);

  args.GetReturnValue().Set(String::NewFromUtf8(isolate, info.c_str()));
}

//----------------- ANTLRGrammarService --------------------------------------------------------------------------------

ANTLRGrammarService::ANTLRGrammarService()
{
  std::cout << "service loaded" << std::endl;
}

//----------------------------------------------------------------------------------------------------------------------

ANTLRGrammarService::~ANTLRGrammarService()
{

}

//----------------------------------------------------------------------------------------------------------------------

void ANTLRGrammarService::init(v8::Local<v8::Object> exports)
{
  Isolate *isolate = exports->GetIsolate();

  // Prepare constructor template.
  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New);
  tpl->SetClassName(String::NewFromUtf8(isolate, "ANTLRGrammarService"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  // Prototype
  //NODE_SET_PROTOTYPE_METHOD(tpl, "infoForSymbol", infoForSymbol);

  constructor.Reset(isolate, tpl->GetFunction());
  exports->Set(String::NewFromUtf8(isolate, "ANTLRGrammarService"), tpl->GetFunction());
}

//----------------------------------------------------------------------------------------------------------------------

void ANTLRGrammarService::New(const FunctionCallbackInfo<Value>& args)
{
  Isolate *isolate = args.GetIsolate();

  if (args.IsConstructCall())
  {
    // Invoked as constructor: `new MyObject(...)`.
    ANTLRGrammarService *obj = new ANTLRGrammarService();
    obj->Wrap(args.This());
    args.GetReturnValue().Set(args.This());
  }
  else
  {
    // Invoked as plain function `MyObject(...)`, turn into construct call.
    const int argc = 1;
    Local<Value> argv[argc] = { args[0] };
    Local<Context> context = isolate->GetCurrentContext();
    Local<Function> cons = Local<Function>::New(isolate, constructor);
    Local<Object> result = cons->NewInstance(context, argc, argv).ToLocalChecked();
    args.GetReturnValue().Set(result);
  }
}

//----------------------------------------------------------------------------------------------------------------------

void initialize(Local<Object> exports) {
  ANTLRGrammarService::init(exports);
  SourceContext::init(exports);
}

//----------------------------------------------------------------------------------------------------------------------

NODE_MODULE(antlr4_graps, initialize)
